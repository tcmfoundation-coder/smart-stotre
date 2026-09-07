'use server';

import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { revalidatePath } from 'next/cache';
import { escapeRegex } from '@/lib/utils';
import { requireManagerOrAdmin } from '@/lib/security';

export async function getOrders(source?: 'online' | 'whatsapp', filters?: { search?: string }) {
  // Matches updateOrderStatus/updatePaymentStatus below and the
  // manager/admin-only nav entries for these pages.
  await requireManagerOrAdmin();
  await connectDB();
  const query: any = {};
  if (source) {
    query.source = source;
  }
  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { orderNumber: { $regex: safeSearch, $options: 'i' } },
      { customerName: { $regex: safeSearch, $options: 'i' } },
      { customerPhone: { $regex: safeSearch, $options: 'i' } },
    ];
  }
  const orders = await Order.find(query).sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(orders));
}

export async function updateOrderStatus(id: string, status: string) {
  // Security check: Managers and admins can update order status
  await requireManagerOrAdmin();

  await connectDB();
  const order = await Order.findByIdAndUpdate(id, { orderStatus: status }, { new: true });
  revalidatePath('/dashboard/online-orders');
  revalidatePath('/dashboard/whatsapp-orders');
  return JSON.parse(JSON.stringify(order));
}

export async function updatePaymentStatus(id: string, status: string) {
  // Security check: Managers and admins can update order status
  await requireManagerOrAdmin();

  await connectDB();
  const order = await Order.findByIdAndUpdate(id, { paymentStatus: status }, { new: true });
  revalidatePath('/dashboard/online-orders');
  revalidatePath('/dashboard/whatsapp-orders');
  return JSON.parse(JSON.stringify(order));
}
