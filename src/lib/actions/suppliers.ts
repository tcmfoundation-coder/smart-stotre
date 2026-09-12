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

  // A non-positive or non-finite amount is never legitimate, and left
  // unchecked it would flip the guard below the same way it would for stock
  // quantities - e.g. 'subtract' with a negative amount would increase debt
  // while bypassing the "cannot exceed outstanding debt" check.
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  // A plain findById -> mutate -> save() here would let two concurrent calls
  // (e.g. a payment recorded at the same time as a new invoiced amount) each
  // read the same outstandingDebt and apply their own delta on top of it,
  // silently losing one of the two updates. The atomic update below applies
  // the delta as part of the same operation that reads current debt, and for
  // 'subtract' only succeeds if enough debt is actually still outstanding.
  const delta = operation === 'add' ? amount : -amount;
  const updateQuery: Record<string, unknown> = { _id: id };
  if (operation === 'subtract') {
    updateQuery.outstandingDebt = { $gte: amount };
  }

  const supplier = await Supplier.findOneAndUpdate(
    updateQuery,
    { $inc: { outstandingDebt: delta } },
    { new: true }
  );

  if (!supplier) {
    const exists = await Supplier.findById(id).select('_id');
    if (!exists) {
      throw new Error('Supplier not found');
    }
    throw new Error('Debt amount exceeds outstanding debt');
  }

  revalidatePath('/dashboard/suppliers');
  return JSON.parse(JSON.stringify(supplier));
}
