'use server';

import connectDB from '@/lib/mongodb';
import { Product, Category } from '@/models';
import { generateSKU, generateBarcode, escapeRegex } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAuth, requireManagerOrAdmin } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

export async function getProducts(filters?: {
  category?: string;
  search?: string;
  lowStock?: boolean;
  expiring?: boolean;
}) {
  await requireAuth();
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const query: any = { isActive: true };

  if (filters?.category) {
    query.categoryId = filters.category;
  }

  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { sku: { $regex: safeSearch, $options: 'i' } },
      { barcode: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  if (filters?.lowStock) {
    query.stockQuantity = { $lte: 10 };
  }

  if (filters?.expiring) {
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    query.expiryDate = { $lte: fifteenDaysFromNow, $gte: new Date() };
  }

  const products = await Product.find(query)
    .populate('categoryId', 'name')
    .populate('supplierId', 'name')
    .sort({ createdAt: -1 });

  return JSON.parse(JSON.stringify(products));
}

export async function getProductById(id: string) {
  await requireAuth();
  const db = await connectDB();
  
  if (!db) {
    return null;
  }

  const product = await Product.findById(id)
    .populate('categoryId', 'name')
    .populate('supplierId', 'name');

  return JSON.parse(JSON.stringify(product));
}

export async function createProduct(data: any) {
  // Security check: Managers and admins can create products
  const currentUser = await requireManagerOrAdmin();

  const db = await connectDB();

  if (!db) {
    throw new Error('Database not connected');
  }

  const sku = data.sku || generateSKU();
  const barcode = data.barcode || generateBarcode();
  const barcodeType = data.barcodeType || 'INTERNAL';

  const product = await Product.create({
    ...data,
    sku,
    barcode,
    barcodeType,
  });

  logActivity({
    action: 'PRODUCT_CREATED',
    description: `${currentUser.name} created product "${product.name}"`,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
  });

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(product));
}

export async function updateProduct(id: string, data: any) {
  // Security check: Managers and admins can update products
  await requireManagerOrAdmin();

  const db = await connectDB();
  
  if (!db) {
    throw new Error('Database not connected');
  }

  const product = await Product.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(product));
}

export async function deleteProduct(id: string) {
  // Security check: Only admins can delete products
  await requireAdmin();

  const db = await connectDB();
  
  if (!db) {
    throw new Error('Database not connected');
  }

  await Product.findByIdAndUpdate(id, { isActive: false });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

export async function updateStock(id: string, quantity: number, operation: 'add' | 'subtract') {
  // Security check: Manager and admin can update stock
  await requireManagerOrAdmin();

  const db = await connectDB();

  if (!db) {
    throw new Error('Database not connected');
  }

  // A negative or zero quantity is never legitimate, and left unchecked it
  // would flip the guard below (e.g. 'subtract' with a negative quantity
  // would increase stock while bypassing the insufficient-stock check).
  // Mongoose's `min: 0` schema validator on Product does not run on
  // $inc-based atomic updates, so this has to be enforced here explicitly.
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('quantity must be a positive whole number');
  }

  // A plain findById -> mutate -> save() here would let two concurrent calls
  // both read the same stockQuantity and each apply their own delta on top
  // of it, silently losing one of the two updates (or letting a 'subtract'
  // pass its pre-check against a now-stale quantity and drive stock
  // negative). The atomic update below applies the delta as part of the same
  // operation that reads current stock, and for 'subtract' only succeeds if
  // enough stock is actually still present at that moment.
  const delta = operation === 'add' ? quantity : -quantity;
  const updateQuery: Record<string, unknown> = { _id: id };
  if (operation === 'subtract') {
    updateQuery.stockQuantity = { $gte: quantity };
  }

  const product = await Product.findOneAndUpdate(
    updateQuery,
    { $inc: { stockQuantity: delta } },
    { new: true }
  );

  if (!product) {
    // Distinguish "no such product" from "insufficient stock" for a useful
    // error message, the same way the original pre-check did.
    const exists = await Product.findById(id).select('_id');
    if (!exists) {
      throw new Error('Product not found');
    }
    throw new Error('Insufficient stock');
  }

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
  }

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(product));
}

export async function getCategories() {
  await requireAuth();
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  return JSON.parse(JSON.stringify(categories));
}


export async function getLowStockProducts() {
  await requireAuth();
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const products = await Product.find({
    isActive: true,
    stockQuantity: { $lte: 10 },
  })
    .populate('categoryId', 'name')
    .sort({ stockQuantity: 1 });

  return JSON.parse(JSON.stringify(products));
}

export async function getExpiringProducts() {
  await requireAuth();
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const products = await Product.find({
    isActive: true,
    expiryDate: { $lte: fifteenDaysFromNow, $gte: new Date() },
  })
    .populate('categoryId', 'name')
    .sort({ expiryDate: 1 });

  return JSON.parse(JSON.stringify(products));
}

