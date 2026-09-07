import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Sale, Expense } from '@/models';
import { handleApiError } from '@/lib/error-handler';

function resolveDateRange(searchParams: URLSearchParams) {
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const dateRange = searchParams.get('dateRange') || 'month';

  const now = new Date();
  let start: Date;
  let end: Date;

  if (startDateParam && endDateParam) {
    start = new Date(startDateParam);
    end = new Date(endDateParam);
  } else {
    end = new Date(now);
    start = new Date(now);
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'quarter':
        start.setDate(start.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'month':
      default:
        start.setDate(start.getDate() - 30);
    }
  }

  // Equal-length preceding period, used for the period-over-period change metrics.
  const spanMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime());
  const previousStart = new Date(start.getTime() - spanMs);

  return { start, end, previousStart, previousEnd };
}

async function computeFinancials(start: Date, end: Date) {
  const [sales, expenses] = await Promise.all([
    Sale.find({ status: 'completed', createdAt: { $gte: start, $lte: end } }).lean(),
    Expense.find({ date: { $gte: start, $lte: end } }).lean(),
  ]);

  const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const cost = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.buyingPrice * item.quantity, 0),
    0
  );
  const grossProfit = revenue - cost;
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return { revenue, totalExpenses, netProfit, profitMargin, expenses };
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function GET(request: NextRequest) {
  return withPermission('view_financial_reports')(async (req) => {
    try {
      await connectDB();

      const { start, end, previousStart, previousEnd } = resolveDateRange(req.nextUrl.searchParams);

      const [current, previous] = await Promise.all([
        computeFinancials(start, end),
        computeFinancials(previousStart, previousEnd),
      ]);

      const expenseByCategory = new Map<string, number>();
      for (const exp of current.expenses) {
        expenseByCategory.set(exp.category, (expenseByCategory.get(exp.category) || 0) + (exp.amount || 0));
      }
      const expenseBreakdown = Array.from(expenseByCategory.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: current.totalExpenses > 0 ? (amount / current.totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const revenueByCategoryAgg = await Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$product.categoryId',
            amount: { $sum: '$items.total' },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $sort: { amount: -1 } },
      ]);

      const revenueByCategory = revenueByCategoryAgg.map((row) => ({
        category: row.category?.name || 'Uncategorized',
        amount: row.amount,
        percentage: current.revenue > 0 ? (row.amount / current.revenue) * 100 : 0,
      }));

      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            totalRevenue: current.revenue,
            netProfit: current.netProfit,
            totalExpenses: current.totalExpenses,
            profitMargin: current.profitMargin,
            revenueChange: percentChange(current.revenue, previous.revenue),
            profitChange: percentChange(current.netProfit, previous.netProfit),
            expensesChange: percentChange(current.totalExpenses, previous.totalExpenses),
            marginChange: current.profitMargin - previous.profitMargin,
          },
          expenseBreakdown,
          revenueByCategory,
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
