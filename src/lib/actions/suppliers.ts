'use server';

import connectDB from '@/lib/mongodb';
import { Supplier } from '@/models';
import { revalidatePath } from 'next/cache';
import { escapeRegex } from '@/lib/utils';
import { requireManagerOrAdmin } from '@/lib/security';

export async function getSuppliers(filters?: {
  search?: string;
}) {
  // Security check: exposes outstanding debt/payment terms - managers and admins only
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const query: any = { isActive: true };

  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { company: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { phone: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const suppliers = await Supplier.find(query).sort({ createdAt: -1 });

  return JSON.parse(JSON.stringify(suppliers));
}

export async function getSupplierById(id: string) {
  // Security check: exposes outstanding debt/payment terms - managers and admins only
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const supplier = await Supplier.findById(id).populate('productsSupplied');

  return JSON.parse(JSON.stringify(supplier));
}

export async function createSupplier(data: any) {
  // Security check: rbac.ts grants manage_suppliers to managers and admins
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const supplier = await Supplier.create(data);

  revalidatePath('/dashboard/suppliers');
  return JSON.parse(JSON.stringify(supplier));
}

export async function updateSupplier(id: string, data: any) {
  // Security check: rbac.ts grants manage_suppliers to managers and admins
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const supplier = await Supplier.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );

  revalidatePath('/dashboard/suppliers');
  return JSON.parse(JSON.stringify(supplier));
}

export async function deleteSupplier(id: string) {
  // Security check: rbac.ts grants manage_suppliers (one bundled permission,
  // no separate delete permission unlike products) to managers and admins
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  await Supplier.findByIdAndUpdate(id, { isActive: false });

  revalidatePath('/dashboard/suppliers');
  return { success: true };
}

export async function updateSupplierDebt(id: string, amount: number, operation: 'add' | 'subtract') {
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new Error('Supplier not found');
  }

  if (operation === 'add') {
    supplier.outstandingDebt += amount;
  } else {
    if (supplier.outstandingDebt < amount) {
      throw new Error('Debt amount exceeds outstanding debt');
    }
    supplier.outstandingDebt -= amount;
  }

  await supplier.save();

  revalidatePath('/dashboard/suppliers');
  return JSON.parse(JSON.stringify(supplier));
}
