'use server';

import connectDB from '@/lib/mongodb';
import { Product, Category, Supplier } from '@/models';
import { generateSKU, generateBarcode, escapeRegex } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireManagerOrAdmin } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

export async function getProducts(filters?: {
  category?: string;
  search?: string;
  lowStock?: boolean;
  expiring?: boolean;
}) {
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

  const product = await Product.findById(id);

  if (!product) {
    throw new Error('Product not found');
  }

  if (operation === 'add') {
    product.stockQuantity += quantity;
  } else {
    if (product.stockQuantity < quantity) {
      throw new Error('Insufficient stock');
    }
    product.stockQuantity -= quantity;
  }

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
  }

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(product));
}

export async function getCategories() {
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  return JSON.parse(JSON.stringify(categories));
}

export async function createCategory(data: any) {
  // Security check: Managers and admins can manage categories
  await requireManagerOrAdmin();

  const db = await connectDB();

  if (!db) {
    throw new Error('Database not connected');
  }

  const category = await Category.create(data);

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(category));
}

export async function updateCategory(id: string, data: any) {
  // Security check: Managers and admins can manage categories
  await requireManagerOrAdmin();

  const db = await connectDB();

  if (!db) {
    throw new Error('Database not connected');
  }

  const category = await Category.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );

  revalidatePath('/dashboard/inventory');
  return JSON.parse(JSON.stringify(category));
}

export async function deleteCategory(id: string) {
  // Security check: Managers and admins can manage categories
  await requireManagerOrAdmin();

  const db = await connectDB();

  if (!db) {
    throw new Error('Database not connected');
  }

  await Category.findByIdAndUpdate(id, { isActive: false });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

export async function getLowStockProducts() {
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

export async function getSuppliers() {
  const db = await connectDB();
  
  if (!db) {
    return [];
  }

  const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });

  return JSON.parse(JSON.stringify(suppliers));
}
