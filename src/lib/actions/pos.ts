'use server';

import connectDB from '@/lib/mongodb';
import { Sale, Product, Customer, Transaction, Loyalty } from '@/models';
import { generateCustomerId, generateTransactionId, escapeRegex } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { generateThankYouMessage } from '@/lib/whatsapp-utils';
import { requireAuth } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

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

  // Calculate sale details
  let subtotal = 0;
  const saleItems = [];

  for (const item of data.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
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

    // Update stock
    product.stockQuantity -= item.quantity;
    await product.save();

    // Check if stock is low and create notification
    if (product.stockQuantity <= product.minStockLevel) {
      const { Notification } = await import('@/models');
      await Notification.create({
        title: 'Low Stock Alert',
        message: `${product.name} is running low on stock (${product.stockQuantity} remaining)`,
        type: 'warning',
        category: 'stock',
        priority: 'high',
      });
      revalidatePath('/dashboard/notifications');
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
  const sale = await Sale.create({
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
  });

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
    orderId: sale._id,
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
        saleId: sale._id.toString(),
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

  return JSON.parse(JSON.stringify(sale));
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
