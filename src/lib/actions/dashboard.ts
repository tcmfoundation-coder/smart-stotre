'use server';

import connectDB from '@/lib/mongodb';
import { Sale, Product, Expense, Customer, Notification } from '@/models';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { requireAuth } from '@/lib/security';

export async function getDashboardStats() {
  // A 'use server' export is independently network-callable regardless of
  // whether any page currently imports it - this returned revenue, profit,
  // and customer data with no authentication check at all before this fix.
  await requireAuth();

  const db = await connectDB();

  if (!db) {
    // Return default data when MongoDB is not connected
    return {
      todayRevenue: 0,
      todaySalesCount: 0,
      monthlyRevenue: 0,
      revenueChange: 0,
      totalProducts: 0,
      lowStockProducts: 0,
      expiringProducts: 0,
      totalExpenses: 0,
      totalProfit: 0,
      totalCustomers: 0,
      recentTransactions: [],
      unreadNotifications: 0,
    };
  }

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subDays(today, 30));
  const lastMonthEnd = endOfMonth(subDays(today, 30));

  // Today's revenue
  const todaySales = await Sale.find({
    createdAt: { $gte: todayStart, $lte: todayEnd },
    status: 'completed'
  });
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  // Today's sales count
  const todaySalesCount = todaySales.length;

  // Monthly revenue
  const monthlySales = await Sale.find({
    createdAt: { $gte: monthStart, $lte: monthEnd },
    status: 'completed'
  });
  const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);

  // Last month revenue for comparison
  const lastMonthSales = await Sale.find({
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    status: 'completed'
  });
  const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.total, 0);

  // Calculate revenue change percentage
  const revenueChange = lastMonthRevenue > 0 
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;

  // Total products
  const totalProducts = await Product.countDocuments({ isActive: true });

  // Low stock products
  const lowStockProducts = await Product.countDocuments({
    isActive: true,
    stockQuantity: { $lte: 10 }
  });

  // Expiring products (within 15 days)
  const fifteenDaysFromNow = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
  const expiringProducts = await Product.countDocuments({
    isActive: true,
    expiryDate: { $lte: fifteenDaysFromNow, $gte: today }
  });

  // Monthly expenses
  const monthlyExpenses = await Expense.find({
    date: { $gte: monthStart, $lte: monthEnd }
  });
  const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate profit. This must stay consistent with how /api/financial-reports
  // defines net profit (revenue - cost of goods sold - expenses) - a plain
  // revenue-minus-expenses figure here would silently overstate profit by
  // the full cost of goods sold, showing a materially different number for
  // the same period than the Financial Reports page.
  const monthlyCogs = monthlySales.reduce(
    (sum, sale) => sum + sale.items.reduce((s, item) => s + item.buyingPrice * item.quantity, 0),
    0
  );
  const totalProfit = monthlyRevenue - monthlyCogs - totalExpenses;

  // Total customers
  const totalCustomers = await Customer.countDocuments();

  // Recent transactions
  const recentTransactions = await Sale.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('customerId', 'name phone')
    .populate('cashierId', 'name');

  // Unread notifications
  const unreadNotifications = await Notification.countDocuments({ isRead: false });

  return {
    todayRevenue,
    todaySalesCount,
    monthlyRevenue,
    revenueChange,
    totalProducts,
    lowStockProducts,
    expiringProducts,
    totalExpenses,
    totalProfit,
    totalCustomers,
    recentTransactions: JSON.parse(JSON.stringify(recentTransactions)),
    unreadNotifications,
  };
}

export async function getSalesData(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  await requireAuth();

  const db = await connectDB();
  
  if (!db) {
    // Return empty data when MongoDB is not connected
    return [];
  }

  const today = new Date();
  let startDate: Date;
  let groupBy: string;

  switch (period) {
    case 'daily':
      startDate = startOfDay(today);
      groupBy = 'hour';
      break;
    case 'weekly':
      startDate = subDays(today, 7);
      groupBy = 'day';
      break;
    case 'monthly':
      startDate = startOfMonth(today);
      groupBy = 'day';
      break;
    case 'yearly':
      startDate = new Date(today.getFullYear(), 0, 1);
      groupBy = 'month';
      break;
    default:
      startDate = startOfDay(today);
      groupBy = 'hour';
  }

  const sales = await Sale.find({
    createdAt: { $gte: startDate },
    status: 'completed'
  }).sort({ createdAt: 1 });

  // Group sales by period
  const groupedData = sales.reduce((acc: any, sale) => {
    const date = new Date(sale.createdAt);
    let key: string;

    switch (groupBy) {
      case 'hour':
        key = date.getHours().toString();
        break;
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toLocaleString('default', { month: 'short' });
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!acc[key]) {
      acc[key] = { revenue: 0, sales: 0, profit: 0 };
    }
    acc[key].revenue += sale.total;
    acc[key].sales += 1;
    acc[key].profit += sale.total - (sale.items.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0));

    return acc;
  }, {});

  return Object.entries(groupedData).map(([key, value]: [string, any]) => ({
    name: key,
    revenue: value.revenue,
    sales: value.sales,
    profit: value.profit,
  }));
}
