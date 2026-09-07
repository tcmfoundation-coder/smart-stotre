import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';
import { handleApiError } from '@/lib/error-handler';

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
        User.countDocuments({ role: { $in: ['admin', 'manager', 'cashier'] } }),
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

      const recentTransactions = await Sale.find({ status: 'completed' })
        .populate('cashierId', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: {
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
          recentTransactions,
        },
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
