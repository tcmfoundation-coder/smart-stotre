'use server';

import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/security';

// Excludes settings.paystackSecretKey even for the admin caller this
// requires - this is a listing/lookup helper (branch pickers, the branches
// page), not the Settings screen that legitimately needs the real secret to
// display and preserve it (api/settings/route.ts reads it directly).
export async function getBranches() {
  await requireAdmin();
  await connectDB();
  const branches = await Branch.find({ isActive: true }).select('-settings.paystackSecretKey').sort({ name: 1 });
  return JSON.parse(JSON.stringify(branches));
}

export async function getBranchById(id: string) {
  await requireAdmin();
  await connectDB();
  const branch = await Branch.findById(id).select('-settings.paystackSecretKey');
  return JSON.parse(JSON.stringify(branch));
}

export async function createBranch(data: any) {
  // Security check: Only admins can manage branches
  await requireAdmin();

  await connectDB();
  const branch = await Branch.create(data);
  revalidatePath('/dashboard/branches');
  return JSON.parse(JSON.stringify(branch));
}

export async function updateBranch(id: string, data: any) {
  // Security check: Only admins can manage branches
  await requireAdmin();

  await connectDB();
  const branch = await Branch.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  revalidatePath('/dashboard/branches');
  return JSON.parse(JSON.stringify(branch));
}

export async function deleteBranch(id: string) {
  // Security check: Only admins can manage branches
  await requireAdmin();

  await connectDB();
  await Branch.findByIdAndUpdate(id, { isActive: false });
  revalidatePath('/dashboard/branches');
  return { success: true };
}
