'use server';

import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Sale, Product, Customer, Transaction, Loyalty } from '@/models';
import { generateCustomerId, generateTransactionId, escapeRegex } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { generateThankYouMessage } from '@/lib/whatsapp-utils';
import { requireAuth } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

interface SaleItemRecord {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  discount: number;
  total: number;
}

interface CreateSaleTransactionResult {
  sale: Record<string, unknown>;
  saleNumber: string;
  saleItems: SaleItemRecord[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lowStockProducts: { name: string; stockQuantity: number }[];
}

export async function searchProducts(query: string) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const safeQuery = escapeRegex(query);
  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: safeQuery, $options: 'i' } },
      { sku: { $regex: safeQuery, $options: 'i' } },
      { barcode: { $regex: safeQuery, $options: 'i' } },
    ],
  })
    .populate('categoryId', 'name')
    .limit(20);

  return JSON.parse(JSON.stringify(products));
}

export async function getProductByBarcode(barcode: string) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const product = await Product.findOne({
    barcode,
    isActive: true,
  })
    .populate('categoryId', 'name');

  if (!product) {
    return null;
  }

  return JSON.parse(JSON.stringify(product));
}

export async function createSale(data: {
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerType?: 'walk-in' | 'registered' | 'vip' | 'corporate';
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    // Accepted for backward compatibility with the cart payload, but never
    // trusted for pricing - see below, price always comes from the
    // product record itself, not the caller.
    price?: number;
  }>;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'paystack';
  cashReceived?: number;
  cashierId?: string;
  branchId?: string;
  notes?: string;
}) {
  // Identity comes from the session, never from the caller - this action is
  // independently network-callable, so a client-supplied cashierId can't be trusted.
  const authUser = await requireAuth();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one item is required');
  }

  // The stock check-and-decrement for every item, plus creating the Sale
  // record itself, run inside one MongoDB transaction so a mid-loop failure
  // (e.g. the 2nd of 3 items is out of stock) can never leave earlier items'
  // stock already decremented with no corresponding Sale - and so two
  // concurrent sales for the same product can never both read "enough stock"
  // and jointly oversell it (the classic findById -> mutate -> save() lost
  // update). Each decrement is also individually atomic
  // (findOneAndUpdate with a stockQuantity guard), which is what actually
  // prevents the lost update; the transaction is what makes the whole set of
  // decrements + the Sale document all-or-nothing.
  const session = await mongoose.startSession();
  let transactionResult: CreateSaleTransactionResult;
  try {
    transactionResult = await session.withTransaction(async (): Promise<CreateSaleTransactionResult> => {
      let subtotal = 0;
      const saleItems: SaleItemRecord[] = [];
      const lowStockProducts: { name: string; stockQuantity: number }[] = [];

      for (const item of data.items) {
        // A negative or zero quantity is never legitimate, and left
        // unchecked it would flip every guard below: the atomic
        // `stockQuantity >= quantity` filter is trivially satisfied by a
        // negative quantity (any non-negative stock is "at least" a negative
        // number), and `$inc: { stockQuantity: -quantity }` would then
        // increase stock instead of decreasing it, while the sale's own
        // total would go negative from the same value. Mongoose's own
        // `min: 0` schema validator on Product does not run on $inc-based
        // atomic updates, so this has to be enforced here explicitly.
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error(`Invalid quantity for item ${item.productId}: quantity must be a positive whole number`);
        }

        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Price always comes from the product record, never the caller - this
        // action is independently network-callable (same reasoning as
        // cashierId/branchId above), and there is no discount/price-override UI
        // anywhere in the app, so a client-supplied price has no legitimate use
        // and would otherwise let a sale be recorded, stock decremented, and
        // loyalty points awarded at an arbitrary fabricated total.
        const itemTotal = product.sellingPrice * item.quantity;
        subtotal += itemTotal;

        saleItems.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          buyingPrice: product.buyingPrice,
          sellingPrice: product.sellingPrice,
          discount: 0,
          total: itemTotal,
        });

        // Atomic guarded decrement: only matches (and only succeeds) if the
        // product still has enough stock at the moment of the write, closing
        // the race window a plain findById -> mutate -> save() leaves open.
        const updated = await Product.findOneAndUpdate(
          { _id: item.productId, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );
        if (!updated) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        if (updated.stockQuantity <= updated.minStockLevel) {
          lowStockProducts.push({ name: updated.name, stockQuantity: updated.stockQuantity });
        }
      }

      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`;

      // Calculate totals
      const discount = 0;
      const tax = 0;
      const total = subtotal - discount + tax;
      const cashReceived = data.cashReceived || total;
      const change = cashReceived - total;

      // Create sale
      const [createdSale] = await Sale.create(
        [
          {
            saleNumber,
            customerId: data.customerId,
            customerName: data.customerName,
            items: saleItems,
            subtotal,
            discount,
            tax,
            total,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'paid',
            cashReceived,
            change,
            cashierId: authUser.id,
            branchId: authUser.branchId || data.branchId,
            notes: data.notes,
            status: 'completed',
          },
        ],
        { session }
      );

      return {
        sale: JSON.parse(JSON.stringify(createdSale)),
        saleNumber,
        saleItems,
        subtotal,
        discount,
        tax,
        total,
        lowStockProducts,
      };
    });
  } finally {
    await session.endSession();
  }

  const { sale, saleNumber, saleItems, subtotal, discount, tax, total, lowStockProducts } = transactionResult;
  const saleId = sale._id as string;

  // Low-stock notifications are a best-effort side effect, not part of the
  // inventory-integrity unit above - created only after the transaction
  // (and therefore the real stock decrement) has actually committed.
  if (lowStockProducts.length > 0) {
    const { Notification } = await import('@/models');
    for (const p of lowStockProducts) {
      await Notification.create({
        title: 'Low Stock Alert',
        message: `${p.name} is running low on stock (${p.stockQuantity} remaining)`,
        type: 'warning',
        category: 'stock',
        priority: 'high',
      });
    }
    revalidatePath('/dashboard/notifications');
  }

  logActivity({
    action: 'SALE_COMPLETED',
    description: `${authUser.name} completed sale ${saleNumber} for ${total}`,
    userId: authUser.id,
    userName: authUser.name,
    userRole: authUser.role,
  });

  // Handle customer - automatic creation or update
  let customerId = data.customerId;
  let customerName = data.customerName || 'Walk-in Customer';
  let customerPhone = data.customerPhone;
  
  if (data.customerPhone) {
    // Check if customer exists by phone
    let customer = await Customer.findOne({ phone: data.customerPhone });
    
    if (customer) {
      // Update existing customer
      customerId = customer._id.toString();
      customerName = customer.name || customerName;
      customerPhone = customer.phone;
      
      if (data.customerName) customer.name = data.customerName;
      if (data.customerEmail) customer.email = data.customerEmail;
      if (data.customerAddress) customer.address = data.customerAddress;
      if (data.customerType) customer.customerType = data.customerType;
      
      customer.totalSpent += total;
      customer.purchaseCount += 1;
      customer.lastPurchaseDate = new Date();
      customer.loyaltyPoints += Math.floor(total / 10); // 1 point per $10 spent
      
      // Update favorite products
      for (const item of saleItems) {
        if (!customer.favoriteProducts.includes(item.productId)) {
          customer.favoriteProducts.push(item.productId);
        }
      }
      
      await customer.save();
      
      // Update loyalty record
      let loyalty = await Loyalty.findOne({ customerId: customer._id });
      if (loyalty) {
        loyalty.pointsBalance = customer.loyaltyPoints;
        loyalty.pointsEarned += Math.floor(total / 10);
        loyalty.totalSpent = customer.totalSpent;
        
        // Update loyalty level based on total spent
        if (loyalty.totalSpent >= 100000) {
          loyalty.level = 'platinum';
        } else if (loyalty.totalSpent >= 50000) {
          loyalty.level = 'gold';
        } else if (loyalty.totalSpent >= 20000) {
          loyalty.level = 'silver';
        } else {
          loyalty.level = 'bronze';
        }
        
        await loyalty.save();
      }
    } else {
      // Create new customer automatically
      try {
        const newCustomerId = generateCustomerId();
        const newCustomer = await Customer.create({
          customerId: newCustomerId,
          phone: data.customerPhone,
          name: data.customerName || 'Walk-in Customer',
          email: data.customerEmail,
          address: data.customerAddress,
          customerType: data.customerType || 'walk-in',
          loyaltyPoints: Math.floor(total / 10),
          totalSpent: total,
          purchaseCount: 1,
          lastPurchaseDate: new Date(),
          favoriteProducts: saleItems.map(item => item.productId),
          favoriteCategories: [],
        });
        
        customerId = newCustomer._id.toString();
        customerName = newCustomer.name ?? customerName;
        customerPhone = newCustomer.phone;
        
        // Create loyalty record
        await Loyalty.create({
          customerId: newCustomer._id,
          pointsBalance: Math.floor(total / 10),
          pointsEarned: Math.floor(total / 10),
          pointsRedeemed: 0,
          level: 'bronze',
          totalSpent: total,
          rewards: [],
        });
      } catch (customerError: any) {
        console.error('Failed to create customer:', customerError);
        // Continue with sale even if customer creation fails
        // Customer will be treated as walk-in
      }
    }
  }

  // Create transaction record
  const transactionId = generateTransactionId();
  const pointsEarned = Math.floor(total / 10);
  
  await Transaction.create({
    transactionId,
    customerId,
    orderId: saleId,
    items: saleItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.sellingPrice,
      total: item.total,
    })),
    subtotal,
    discount,
    tax,
    total,
    paymentMethod: data.paymentMethod,
    pointsEarned,
    branchId: authUser.branchId || data.branchId,
    cashierId: authUser.id,
  });

  // Send WhatsApp thank you message if customer phone is available
  if (customerPhone && customerName) {
    console.log('📱 Customer has phone number, attempting to send WhatsApp message...');
    try {
      const message = generateThankYouMessage(customerName, total);
      console.log('📝 Generated thank you message:', message.substring(0, 50) + '...');
      
      const whatsappResult = await sendWhatsAppMessage({
        customerId,
        customerName,
        customerPhone,
        message,
        saleId,
        amount: total,
      });
      
      console.log('📱 WhatsApp sending result:', whatsappResult);
    } catch (error) {
      // Log error but don't fail the sale if WhatsApp fails
      console.error('❌ Failed to send WhatsApp message:', error);
    }
  } else {
    console.log('⚠️ No customer phone number provided, skipping WhatsApp message');
  }

  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard');

  return sale;
}

export async function getSaleById(id: string) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const sale = await Sale.findById(id)
    .populate('customerId', 'name phone email')
    .populate('cashierId', 'name')
    .populate('branchId', 'name');

  return JSON.parse(JSON.stringify(sale));
}

export async function getRecentSales(limit: number = 10) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const sales = await Sale.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'name')
    .populate('cashierId', 'name');

  return JSON.parse(JSON.stringify(sales));
}
