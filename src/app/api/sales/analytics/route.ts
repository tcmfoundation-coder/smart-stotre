import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Sale } from '@/models';
import { auth } from '@/lib/auth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subWeeks, subYears } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let lastPeriodStart: Date;
    let lastPeriodEnd: Date;
    let groupBy: string;

    switch (period) {
      case 'daily':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        lastPeriodStart = startOfDay(subDays(today, 1));
        lastPeriodEnd = endOfDay(subDays(today, 1));
        groupBy = 'hour';
        break;
      case 'weekly':
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        lastPeriodStart = startOfWeek(subWeeks(today, 1));
        lastPeriodEnd = endOfWeek(subWeeks(today, 1));
        groupBy = 'day';
        break;
      case 'monthly':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        lastPeriodStart = startOfMonth(subMonths(today, 1));
        lastPeriodEnd = endOfMonth(subMonths(today, 1));
        groupBy = 'day';
        break;
      case 'yearly':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        lastPeriodStart = startOfYear(subYears(today, 1));
        lastPeriodEnd = endOfYear(subYears(today, 1));
        groupBy = 'month';
        break;
      default:
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        lastPeriodStart = startOfMonth(subMonths(today, 1));
        lastPeriodEnd = endOfMonth(subMonths(today, 1));
        groupBy = 'day';
    }

    const currentSales = await Sale.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    const lastSales = await Sale.find({
      createdAt: { $gte: lastPeriodStart, $lte: lastPeriodEnd },
      status: 'completed'
    });

    const saleProfit = (sale: (typeof currentSales)[number]) =>
      sale.total - sale.items.reduce((sum, item) => sum + item.buyingPrice * item.quantity, 0);

    const currentRevenue = currentSales.reduce((sum, s) => sum + s.total, 0);
    const lastRevenue = lastSales.reduce((sum, s) => sum + s.total, 0);
    const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    const currentProfit = currentSales.reduce((sum, s) => sum + saleProfit(s), 0);
    const lastProfit = lastSales.reduce((sum, s) => sum + saleProfit(s), 0);
    const profitChange = lastProfit > 0 ? ((currentProfit - lastProfit) / lastProfit) * 100 : 0;

    const currentCount = currentSales.length;
    const lastCount = lastSales.length;
    const salesChange = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0;

    const currentAvg = currentCount > 0 ? currentRevenue / currentCount : 0;
    const lastAvg = lastCount > 0 ? lastRevenue / lastCount : 0;
    const avgChange = lastAvg > 0 ? ((currentAvg - lastAvg) / lastAvg) * 100 : 0;

    // Grouping for chart
    const groupedData = currentSales.reduce((acc: Record<string, { name: string; revenue: number; sales: number; profit: number }>, sale) => {
      const date = new Date(sale.createdAt);
      let key: string;
      if (groupBy === 'hour') key = `${date.getHours()}:00`;
      else if (groupBy === 'day') key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      else key = date.toLocaleDateString('en-US', { month: 'short' });

      if (!acc[key]) acc[key] = { name: key, revenue: 0, sales: 0, profit: 0 };
      acc[key].revenue += sale.total;
      acc[key].sales += 1;
      acc[key].profit += saleProfit(sale);
      return acc;
    }, {});

    const chartData = Object.values(groupedData);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenue: currentRevenue,
          totalSales: currentCount,
          totalProfit: currentProfit,
          avgTransaction: currentAvg,
          revenueChange,
          salesChange,
          profitChange,
          avgChange
        },
        chartData
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
