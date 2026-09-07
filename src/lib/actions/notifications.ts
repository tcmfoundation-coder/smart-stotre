'use server';

import connectDB from '@/lib/mongodb';
import { Notification } from '@/models';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/security';

export interface NotificationRequester {
  userId: string;
  userRole: string;
  branchId?: any;
}

// These actions are independently network-callable (Next.js server actions
// bypass the API route layer), so identity must be re-derived from the real
// session on every call rather than trusted from a caller-supplied requester -
// otherwise anyone could claim { userRole: 'admin' } and see/act on
// everything.
async function requireRequester(): Promise<NotificationRequester> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Authentication required');
  }
  return {
    userId: currentUser.id,
    userRole: currentUser.role,
    branchId: currentUser.branchId,
  };
}

// Which notifications a given user is allowed to see/act on.
// Admins see everything. Managers see their branch + broadly-relevant
// categories. Cashiers see their own + a narrower set of categories.
function buildVisibilityFilter(requester: NotificationRequester): any {
  if (requester.userRole === 'admin') {
    return {};
  }

  if (requester.userRole === 'manager') {
    return {
      $or: [
        { userId: requester.userId },
        { category: { $in: ['system', 'stock', 'expiry', 'payment', 'ai_insight'] } },
        { userRole: { $in: ['manager', 'cashier'] } },
        { branchId: requester.branchId },
      ],
    };
  }

  // cashier (or any other/unknown role) — most restrictive
  return {
    $or: [
      { userId: requester.userId },
      { category: { $in: ['system', 'stock', 'expiry'] } },
      { userRole: 'cashier' },
    ],
  };
}

export async function getNotifications(filters?: {
  isRead?: boolean;
  category?: string;
}) {
  const requester = await requireRequester();
  await connectDB();

  const query: any = { ...buildVisibilityFilter(requester) };

  if (filters?.isRead !== undefined) {
    query.isRead = filters.isRead;
  }

  if (filters?.category) {
    query.category = filters.category;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50);

  return JSON.parse(JSON.stringify(notifications));
}

export async function getNotificationById(id: string) {
  const requester = await requireRequester();
  await connectDB();

  const notification = await Notification.findOne({ _id: id, ...buildVisibilityFilter(requester) });

  return JSON.parse(JSON.stringify(notification));
}

export async function createNotification(data: any) {
  const requester = await requireRequester();
  await connectDB();

  const notification = await Notification.create({
    ...data,
    userId: requester.userId,
    userRole: requester.userRole,
    branchId: requester.branchId,
  });

  revalidatePath('/dashboard/notifications');
  return JSON.parse(JSON.stringify(notification));
}

export async function markAsRead(id: string) {
  const requester = await requireRequester();
  await connectDB();

  const query = { _id: id, ...buildVisibilityFilter(requester) };
  const notification = await Notification.findOneAndUpdate(
    query,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new Error('Notification not found');
  }

  revalidatePath('/dashboard/notifications');
  return JSON.parse(JSON.stringify(notification));
}

export async function markAllAsRead() {
  const requester = await requireRequester();
  await connectDB();

  const query = { isRead: false, ...buildVisibilityFilter(requester) };
  await Notification.updateMany(query, { isRead: true });

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function deleteNotification(id: string) {
  const requester = await requireRequester();
  await connectDB();

  const query = { _id: id, ...buildVisibilityFilter(requester) };
  const result = await Notification.findOneAndDelete(query);

  if (!result) {
    throw new Error('Notification not found');
  }

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function getUnreadCount() {
  const requester = await requireRequester();
  await connectDB();

  const query = { isRead: false, ...buildVisibilityFilter(requester) };
  const count = await Notification.countDocuments(query);
  return count;
}
