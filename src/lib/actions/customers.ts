'use server';

import connectDB from '@/lib/mongodb';
import { Customer, Loyalty } from '@/models';
import { revalidatePath } from 'next/cache';
import { escapeRegex } from '@/lib/utils';
import { requireAuth, requireManagerOrAdmin } from '@/lib/security';

export async function getCustomers(filters?: {
  search?: string;
}) {
  // Every role (cashier included) holds view_customers in rbac.ts.
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const query: any = {};

  if (filters?.search) {
    const safeSearch = escapeRegex(filters.search);
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { phone: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const customers = await Customer.find(query).sort({ createdAt: -1 });

  return JSON.parse(JSON.stringify(customers));
}

export async function getCustomerById(id: string) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const customer = await Customer.findById(id);

  return JSON.parse(JSON.stringify(customer));
}

export async function createCustomer(data: any) {
  // Security check: Managers and admins can manage customers
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const customer = await Customer.create(data);

  revalidatePath('/dashboard/customers');
  return JSON.parse(JSON.stringify(customer));
}

export async function updateCustomer(id: string, data: any) {
  // Security check: Managers and admins can manage customers
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const customer = await Customer.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true }
  );

  revalidatePath('/dashboard/customers');
  return JSON.parse(JSON.stringify(customer));
}

export async function deleteCustomer(id: string) {
  // Security check: Managers and admins can manage customers
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  await Customer.findByIdAndDelete(id);

  revalidatePath('/dashboard/customers');
  return { success: true };
}

export async function getTopCustomers(limit: number = 10) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const customers = await Customer.find()
    .sort({ totalSpent: -1 })
    .limit(limit);

  return JSON.parse(JSON.stringify(customers));
}

export async function getCustomerAnalytics() {
  // Security check: exposes revenue/customer analytics - managers and admins only
  await requireManagerOrAdmin();

  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const totalCustomers = await Customer.countDocuments();
  const customers = await Customer.find();

  const totalRevenue = customers.reduce((sum: number, c: any) => sum + (c.totalSpent || 0), 0);
  const averageSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const totalPoints = customers.reduce((sum: number, c: any) => sum + (c.loyaltyPoints || 0), 0);

  const topSpenders = JSON.parse(JSON.stringify(await Customer.find()
    .sort({ totalSpent: -1 })
    .limit(10)
    .lean()));

  const frequentCustomers = JSON.parse(JSON.stringify(await Customer.find()
    .sort({ purchaseCount: -1 })
    .limit(10)
    .lean()));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCustomers = await Customer.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

  const returningCustomers = await Customer.countDocuments({ purchaseCount: { $gte: 2 } });
  const returningRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPurchases = await Customer.countDocuments({ lastPurchaseDate: { $gte: sevenDaysAgo } });

  // Get loyalty levels distribution
  const loyaltyLevels = await Loyalty.aggregate([
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
      },
    },
  ]);

  const loyaltyLevelsData = [
    { name: 'bronze', count: 0, percentage: 0 },
    { name: 'silver', count: 0, percentage: 0 },
    { name: 'gold', count: 0, percentage: 0 },
    { name: 'platinum', count: 0, percentage: 0 },
  ];

  loyaltyLevels.forEach((level: any) => {
    const index = loyaltyLevelsData.findIndex(l => l.name === level._id);
    if (index !== -1) {
      loyaltyLevelsData[index].count = level.count;
      loyaltyLevelsData[index].percentage = totalCustomers > 0 ? (level.count / totalCustomers) * 100 : 0;
    }
  });

  return {
    totalCustomers,
    totalRevenue,
    averageSpend,
    totalPoints,
    topSpenders,
    frequentCustomers,
    newCustomers,
    returningCustomers,
    returningRate: returningRate.toFixed(1),
    recentPurchases,
    loyaltyLevels: loyaltyLevelsData,
  };
}

export async function getCustomerPurchaseHistory(customerId: string) {
  await requireAuth();
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Database connection failed');
  }

  const { Sale } = await import('@/models');
  
  const sales = await Sale.find({ customerId })
    .sort({ createdAt: -1 })
    .populate('cashierId', 'name')
    .populate('branchId', 'name');

  return JSON.parse(JSON.stringify(sales));
}
