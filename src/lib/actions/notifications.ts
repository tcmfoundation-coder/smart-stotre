'use server';

import connectDB from '@/lib/mongodb';
import { Notification } from '@/models';
import { revalidatePath } from 'next/cache';

export interface NotificationRequester {
  userId: string;
  userRole: string;
  branchId?: any;
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
  userId?: string;
  isRead?: boolean;
  category?: string;
  userRole?: string;
  branchId?: any;
}) {
  await connectDB();

  const query: any = {};

  if (filters?.isRead !== undefined) {
    query.isRead = filters.isRead;
  }

  if (filters?.category) {
    query.category = filters.category;
  }

  if (filters?.userRole && filters?.userId) {
    Object.assign(query, buildVisibilityFilter({
      userId: filters.userId,
      userRole: filters.userRole,
      branchId: filters.branchId,
    }));
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50);

  return JSON.parse(JSON.stringify(notifications));
}

export async function getNotificationById(id: string) {
  await connectDB();

  const notification = await Notification.findById(id);

  return JSON.parse(JSON.stringify(notification));
}

export async function createNotification(data: any) {
  await connectDB();

  const notification = await Notification.create(data);

  revalidatePath('/dashboard/notifications');
  return JSON.parse(JSON.stringify(notification));
}

export async function markAsRead(id: string, requester: NotificationRequester) {
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

export async function markAllAsRead(requester: NotificationRequester) {
  await connectDB();

  const query = { isRead: false, ...buildVisibilityFilter(requester) };
  await Notification.updateMany(query, { isRead: true });

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function deleteNotification(id: string, requester: NotificationRequester) {
  await connectDB();

  const query = { _id: id, ...buildVisibilityFilter(requester) };
  const result = await Notification.findOneAndDelete(query);

  if (!result) {
    throw new Error('Notification not found');
  }

  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function getUnreadCount(requester: NotificationRequester) {
  await connectDB();

  const query = { isRead: false, ...buildVisibilityFilter(requester) };
  const count = await Notification.countDocuments(query);
  return count;
}
