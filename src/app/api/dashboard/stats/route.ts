import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import { handleApiError } from '@/lib/error-handler';
import { getDashboardCards, UserRole } from '@/lib/rbac';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';

// Each dashboard KPI card is mapped to the response field(s) it reads, so a
// role only receives the figures its own dashboard is allowed to show (per
// rbac.ts's dashboardCards) - this endpoint previously returned every
// aggregate to any authenticated user regardless of role, relying only on
// the frontend to hide cards it shouldn't render; a cashier could still read
// store-wide revenue and other roles' recent transactions by calling this
// endpoint directly.
const CARD_FIELDS: Record<string, string[]> = {
  totalRevenue: ['totalRevenue'],
  todaySales: ['todayRevenue', 'todaySalesCount'],
  weeklySales: ['weeklyRevenue'],
  monthlySales: ['monthlyRevenue', 'revenueChange'],
  totalProducts: ['totalProducts'],
  lowStockProducts: ['lowStockProducts'],
  lowStockAlerts: ['lowStockProducts'],
  outOfStockProducts: ['outOfStockProducts'],
  outOfStockItems: ['outOfStockProducts'],
  totalEmployees: ['totalEmployees'],
  totalCustomers: ['totalCustomers'],
  customerCount: ['totalCustomers'],
  numberOfTransactions: ['todaySalesCount'],
  itemsSoldToday: ['itemsSoldToday'],
};

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const lastMonthStart = new Date(today);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      
      const lastMonthEnd = new Date(today);
      lastMonthEnd.setDate(0);

      // Parallel queries for better performance
      const [
        totalRevenue,
        todaySales,
        weeklyRevenue,
        monthlyRevenue,
        lastMonthRevenue,
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalEmployees,
        totalCustomers,
        todaySalesCount,
        itemsSoldToday,
      ] = await Promise.all([
        Sale.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Sale.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
        Sale.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: weekAgo } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Sale.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: monthAgo } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Sale.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Product.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: true, stockQuantity: { $lt: 10, $gt: 0 } }),
        Product.countDocuments({ isActive: true, stockQuantity: { $lte: 0 } }),
        User.countDocuments({ role: { $in: ['admin', 'manager', 'cashier'] }, isActive: true }),
        Customer.countDocuments({}),
        Sale.countDocuments({ status: 'completed', createdAt: { $gte: today } }),
        Sale.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: today } } },
          { $unwind: '$items' },
          { $group: { _id: null, total: { $sum: '$items.quantity' } } },
        ]),
      ]);

      const revenueChange = lastMonthRevenue[0]?.total
        ? ((monthlyRevenue[0]?.total || 0) - lastMonthRevenue[0]?.total) / lastMonthRevenue[0]?.total * 100
        : 0;

      const role = user.role as UserRole;
      const roleConfig = getDashboardRoleConfig(role);

      const recentTransactions = roleConfig.showRecentTransactions
        ? await Sale.find({ status: 'completed' })
            .populate('cashierId', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
        : [];

      const fullData: Record<string, unknown> = {
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todaySales[0]?.total || 0,
        todaySalesCount: todaySales[0]?.count || 0,
        weeklyRevenue: weeklyRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        revenueChange,
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalEmployees,
        totalCustomers,
        itemsSoldToday: itemsSoldToday[0]?.total || 0,
      };

      const allowedFields = new Set<string>();
      for (const card of getDashboardCards(role)) {
        for (const field of CARD_FIELDS[card] || []) allowedFields.add(field);
      }

      const scopedData: Record<string, unknown> = { recentTransactions };
      for (const [key, value] of Object.entries(fullData)) {
        if (allowedFields.has(key)) scopedData[key] = value;
      }

      return NextResponse.json({
        success: true,
        data: scopedData,
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
