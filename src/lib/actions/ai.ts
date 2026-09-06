'use server';

import connectDB from '@/lib/mongodb';
import { Sale, Product, Expense, Customer, AIReport } from '@/models';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

type NvidiaChatCompletionParams = ChatCompletionCreateParamsNonStreaming & {
  chat_template_kwargs?: {
    thinking?: boolean;
  };
};

const aiModel = process.env.NVIDIA_AI_MODEL || 'deepseek-ai/deepseek-v4-pro';

// Constructed lazily (not at module load) so a missing NVIDIA_API_KEY only
// fails the specific AI request that needs it, rather than the build itself
// or every route that happens to import this file.
function getOpenAIClient(): OpenAI {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('AI features are not configured: NVIDIA_API_KEY is not set.');
  }
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  });
}

export async function getBusinessInsights(query: string, userId: string) {
  const db = await connectDB();

  // Fetch relevant business data
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastYearMonthStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const lastYearMonthEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);

  // Current month data
  const monthlySales = db
    ? await Sale.find({
        createdAt: { $gte: monthStart },
        status: 'completed'
      })
    : [];

  const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
  const monthlyProfit = monthlySales.reduce((sum, sale) => {
    const cost = sale.items.reduce((itemSum, item) => itemSum + (item.buyingPrice * item.quantity), 0);
    return sum + (sale.total - cost);
  }, 0);

  const monthlyExpenses = db
    ? await Expense.find({
        date: { $gte: monthStart }
      })
    : [];
  const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Previous month data for comparison
  const lastMonthSales = db
    ? await Sale.find({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        status: 'completed'
      })
    : [];

  const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.total, 0);
  const lastMonthProfit = lastMonthSales.reduce((sum, sale) => {
    const cost = sale.items.reduce((itemSum, item) => itemSum + (item.buyingPrice * item.quantity), 0);
    return sum + (sale.total - cost);
  }, 0);

  // Same month last year for year-over-year comparison
  const lastYearSales = db
    ? await Sale.find({
        createdAt: { $gte: lastYearMonthStart, $lte: lastYearMonthEnd },
        status: 'completed'
      })
    : [];

  const lastYearRevenue = lastYearSales.reduce((sum, sale) => sum + sale.total, 0);
  const lastYearProfit = lastYearSales.reduce((sum, sale) => {
    const cost = sale.items.reduce((itemSum, item) => itemSum + (item.buyingPrice * item.quantity), 0);
    return sum + (sale.total - cost);
  }, 0);

  // Calculate growth rates
  const revenueGrowthRate = lastMonthRevenue > 0 
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;
  const profitGrowthRate = lastMonthProfit > 0 
    ? ((monthlyProfit - lastMonthProfit) / lastMonthProfit) * 100 
    : 0;
  const yearOverYearGrowth = lastYearRevenue > 0 
    ? ((monthlyRevenue - lastYearRevenue) / lastYearRevenue) * 100 
    : 0;

  // Historical trend data (last 6 months)
  const historicalTrend = db
    ? await Sale.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalRevenue: { $sum: '$total' },
            totalSales: { $sum: 1 },
            avgTransactionValue: { $avg: '$total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 6 }
      ])
    : [];

  // Low stock and expiring products
  const lowStockProducts = db
    ? await Product.find({
        stockQuantity: { $lte: 10 },
        isActive: true
      })
    : [];

  const expiringProducts = db
    ? await Product.find({
        expiryDate: { $lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        isActive: true
      })
    : [];

  // Top products with more detail
  const topProducts = db
    ? await Sale.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' }, avgPrice: { $avg: '$items.price' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ])
    : [];

  // Product performance trends (compare with previous month)
  const productTrends = db
    ? await Sale.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              productId: '$items.productId',
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ])
    : [];

  // Prepare context for AI
  const context = {
    // Current month metrics
    monthlyRevenue,
    monthlyProfit,
    totalExpenses,
    netProfit: monthlyProfit - totalExpenses,
    totalSales: monthlySales.length,
    avgTransactionValue: monthlySales.length > 0 ? monthlyRevenue / monthlySales.length : 0,
    
    // Historical comparisons
    lastMonthRevenue,
    lastMonthProfit,
    lastYearRevenue,
    lastYearProfit,
    
    // Growth rates
    revenueGrowthRate,
    profitGrowthRate,
    yearOverYearGrowth,
    
    // Historical trends
    historicalTrend: historicalTrend.map(t => ({
      year: t._id.year,
      month: t._id.month,
      totalRevenue: t.totalRevenue,
      totalSales: t.totalSales,
      avgTransactionValue: t.avgTransactionValue
    })),
    
    // Product performance
    topProducts: topProducts.map(p => ({
      productId: p._id,
      totalSold: p.totalSold,
      revenue: p.revenue,
      avgPrice: p.avgPrice
    })),
    productTrends: productTrends.map(t => ({
      productId: t._id.productId,
      year: t._id.year,
      month: t._id.month,
      totalSold: t.totalSold,
      revenue: t.revenue
    })),
    
    // Inventory alerts
    lowStockCount: lowStockProducts.length,
    expiringCount: expiringProducts.length,
    lowStockProducts: lowStockProducts.map(p => ({
      name: p.name,
      stockQuantity: p.stockQuantity,
      categoryId: p.categoryId
    })),
    expiringProducts: expiringProducts.map(p => ({
      name: p.name,
      expiryDate: p.expiryDate,
      daysUntilExpiry: p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
    })),
    
    dataAvailable: Boolean(db)
  };

  // Generate AI response
  const prompt = `You are an AI business assistant for a supermarket with expertise in retail analytics, inventory management, and business strategy.

  ${context.dataAvailable
    ? "Here is the comprehensive business data with historical context:"
    : "The live database is currently unavailable, so no current business metrics could be loaded. Be transparent about that and provide general supermarket management guidance based on the user's question."}
  
  === CURRENT MONTH PERFORMANCE ===
  Monthly Revenue: $${context.monthlyRevenue.toFixed(2)}
  Monthly Profit: $${context.monthlyProfit.toFixed(2)}
  Total Expenses: $${context.totalExpenses.toFixed(2)}
  Net Profit: $${context.netProfit.toFixed(2)}
  Total Sales: ${context.totalSales}
  Average Transaction Value: $${context.avgTransactionValue.toFixed(2)}
  
  === HISTORICAL COMPARISONS ===
  Previous Month Revenue: $${context.lastMonthRevenue.toFixed(2)}
  Previous Month Profit: $${context.lastMonthProfit.toFixed(2)}
  Same Month Last Year Revenue: $${context.lastYearRevenue.toFixed(2)}
  Same Month Last Year Profit: $${context.lastYearProfit.toFixed(2)}
  
  === GROWTH ANALYSIS ===
  Revenue Growth Rate (vs last month): ${context.revenueGrowthRate.toFixed(1)}%
  Profit Growth Rate (vs last month): ${context.profitGrowthRate.toFixed(1)}%
  Year-over-Year Growth: ${context.yearOverYearGrowth.toFixed(1)}%
  
  === HISTORICAL TRENDS (Last 6 months) ===
  ${context.historicalTrend && context.historicalTrend.length > 0 
    ? context.historicalTrend.map(t => `${t.year}-${String(t.month).padStart(2, '0')}: $${t.totalRevenue.toFixed(2)} revenue, ${t.totalSales} sales, $${t.avgTransactionValue.toFixed(2)} avg transaction`).join('\n')
    : 'No historical trend data available'}
  
  === TOP SELLING PRODUCTS (Current Month) ===
  ${context.topProducts && context.topProducts.length > 0
    ? context.topProducts.map(p => `Product ID ${p.productId}: ${p.totalSold} units sold, $${p.revenue.toFixed(2)} revenue, $${p.avgPrice?.toFixed(2) || 'N/A'} avg price`).join('\n')
    : 'No sales data available for current month'}
  
  === PRODUCT PERFORMANCE TRENDS ===
  ${context.productTrends && context.productTrends.length > 0
    ? context.productTrends.slice(0, 10).map(t => `${t.productId} (${t.year}-${String(t.month).padStart(2, '0')}): ${t.totalSold} sold, $${t.revenue.toFixed(2)} revenue`).join('\n')
    : 'No product trend data available'}
  
  === INVENTORY ALERTS ===
  Low Stock Products (${context.lowStockCount}): ${context.lowStockProducts && context.lowStockProducts.length > 0 
    ? context.lowStockProducts.map(p => `${p.name} (${p.stockQuantity} units)`).join(', ')
    : 'No low stock items'}
  Expiring Products (${context.expiringCount}): ${context.expiringProducts && context.expiringProducts.length > 0
    ? context.expiringProducts.map(p => `${p.name} (${p.daysUntilExpiry} days)`).join(', ')
    : 'No expiring items'}
  
  === USER QUESTION ===
  ${query}
  
  === INSTRUCTIONS ===
  Provide a sophisticated, data-driven analysis that includes:
  1. **Trend Analysis**: Identify patterns in the historical data, seasonality, and momentum
  2. **Comparative Insights**: Compare current performance against previous periods and explain variances
  3. **Growth Assessment**: Evaluate growth rates and determine if they're healthy, concerning, or exceptional
  4. **Root Cause Analysis**: Suggest potential reasons for observed trends (seasonal, operational, market factors)
  5. **Strategic Recommendations**: Provide specific, prioritized actions with expected impact
  6. **Risk Assessment**: Highlight risks based on the data (stockouts, expiry losses, declining trends)
  7. **Opportunity Identification**: Point out underperforming areas with improvement potential
  
  Use markdown formatting with headers, tables, and bullet points for clarity. Be specific with numbers and percentages. If live data is unavailable, be transparent and provide general guidance without inventing metrics.`;

  try {
    // Check if API key is configured
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error('NVIDIA_API_KEY is not configured in environment variables');
    }

    console.log('[NVIDIA AI] Sending request...');
    console.log('[NVIDIA AI] Model:', aiModel);
    console.log('[NVIDIA AI] Query:', query);
    console.log('[NVIDIA AI] Context:', JSON.stringify(context, null, 2));

    const completionParams: NvidiaChatCompletionParams = {
      model: aiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      chat_template_kwargs: { thinking: false },
      stream: false,
    };

    const completion = await getOpenAIClient().chat.completions.create(completionParams);
    const response = completion.choices[0]?.message?.content || '';

    console.log('[NVIDIA AI] Response received successfully');
    console.log('[NVIDIA AI] Response length:', response.length);

    // Save the AI report when the database is available.
    if (db) {
      await AIReport.create({
        title: query.substring(0, 50) + '...',
        type: 'business_insight',
        query,
        response,
        data: context,
        confidence: context.dataAvailable ? 85 : 40,
        generatedBy: userId,
        tags: ['insight', 'analysis'],
      });
    }

    return {
      success: true,
      response,
      data: context,
      model: aiModel,
    };
  } catch (error: any) {
    console.error('[NVIDIA AI] Error:', error);
    
    // Detailed error logging
    if (error.message.includes('API key')) {
      console.error('[NVIDIA AI] API Key Error: Invalid or missing API key');
      return {
        success: false,
        error: 'Invalid or missing NVIDIA AI API key. Please check your environment configuration.',
        details: 'Ensure NVIDIA_API_KEY is set in your .env.local file',
      };
    }
    
    if (error.message.includes('quota') || error.message.includes('429')) {
      console.error('[NVIDIA AI] Quota Error: API quota exceeded');
      return {
        success: false,
        error: 'API quota exceeded. Please check your NVIDIA API quota.',
        details: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to generate AI response',
      details: error.message,
    };
  }
}

export async function getAIReports(userId?: string) {
  await connectDB();

  const query = userId ? { generatedBy: userId } : {};
  const reports = await AIReport.find(query)
    .sort({ createdAt: -1 })
    .limit(20);

  return JSON.parse(JSON.stringify(reports));
}

export async function predictSales(productId: string, days: number = 30) {
  await connectDB();

  // Get historical sales data for the product
  const historicalSales = await Sale.aggregate([
    { $match: { status: 'completed' } },
    { $unwind: '$items' },
    { $match: { 'items.productId': productId } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    { $limit: 90 }
  ]);

  // Simple prediction based on average
  const avgDailySales = historicalSales.length > 0
    ? historicalSales.reduce((sum, s) => sum + s.totalSold, 0) / historicalSales.length
    : 0;

  const predictedSales = Math.round(avgDailySales * days);
  const predictedRevenue = predictedSales * 10; // Assuming avg price of $10

  return {
    productId,
    days,
    predictedSales,
    predictedRevenue,
    confidence: 70,
    historicalData: historicalSales,
  };
}
