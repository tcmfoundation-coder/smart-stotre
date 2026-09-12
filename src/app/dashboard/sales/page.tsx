'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Calendar, TrendingUp, DollarSign, ShoppingCart, BarChart3, Activity } from 'lucide-react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))', 'hsl(var(--chart-4))'];

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalProfit: 0,
    avgTransaction: 0,
    revenueChange: 0,
    salesChange: 0,
    profitChange: 0,
    avgChange: 0
  });
  const fetchSalesData = async () => {
    try {
      const response = await fetch(`/api/sales/analytics?period=${period}`);
      const data = await response.json();
      if (data.success) {
        setSalesData(data.data.chartData);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Advanced Analytics" userRole="admin" />
      
      <main className="p-8">
        {/* Period Selector */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Revenue Intel</h2>
            <p className="text-muted-foreground font-medium text-sm mt-1">Deep dive into your supermarket's financial trajectory.</p>
          </div>
          <div className="flex items-center bg-card p-1.5 rounded-2xl border border-border shadow-sm">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Gross Revenue</p>
                <h3 className="text-2xl font-black text-foreground">{formatCurrency(stats.totalRevenue)}</h3>
                <p className={`text-[10px] font-black mt-2 uppercase tracking-widest flex items-center ${stats.revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}% Velocity
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <DollarSign className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Sales Volume</p>
                <h3 className="text-2xl font-black text-foreground">{stats.totalSales.toLocaleString()}</h3>
                <p className={`text-[10px] font-black mt-2 uppercase tracking-widest flex items-center ${stats.salesChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.salesChange >= 0 ? '↑' : '↓'} {Math.abs(stats.salesChange).toFixed(1)}% Volume
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <Activity className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Net Earnings</p>
                <h3 className="text-2xl font-black text-foreground">{formatCurrency(stats.totalProfit)}</h3>
                <p className={`text-[10px] font-black mt-2 uppercase tracking-widest flex items-center ${stats.profitChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.profitChange >= 0 ? '↑' : '↓'} {Math.abs(stats.profitChange).toFixed(1)}% Efficiency
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl">
                <TrendingUp className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg. Basket</p>
                <h3 className="text-2xl font-black text-foreground">{formatCurrency(stats.avgTransaction)}</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Per user session</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
                <BarChart3 className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Trend */}
          <div className="bg-card rounded-[2.5rem] shadow-sm border border-border p-10 hover:shadow-xl transition-all duration-500">
            <div className="flex items-center space-x-3 mb-10">
              <div className="h-6 w-1.5 bg-chart-1 rounded-full"></div>
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Revenue Trajectory</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₦${value}`} tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '24px', border: '1px solid hsl(var(--border))', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--popover))' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px', color: 'hsl(var(--popover-foreground))' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', fontSize: '10px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--chart-1))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales vs Profit */}
          <div className="bg-card rounded-[2.5rem] shadow-sm border border-border p-10 hover:shadow-xl transition-all duration-500">
            <div className="flex items-center space-x-3 mb-10">
              <div className="h-6 w-1.5 bg-chart-2 rounded-full"></div>
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Profitability Matrix</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '24px', border: '1px solid hsl(var(--border))', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--popover))' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px', color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))' }} />
                  <Bar dataKey="sales" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} name="Volume" />
                  <Bar dataKey="profit" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
