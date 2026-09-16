'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Activity, TrendingUp, BarChart3 } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Day', value: 'daily' },
  { label: 'Week', value: 'weekly' },
  { label: 'Month', value: 'monthly' },
  { label: 'Year', value: 'yearly' },
];

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border border-border bg-card p-4 shadow-md">
        <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold text-foreground">
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalProfit: 0,
    avgTransaction: 0,
    revenueChange: 0,
    salesChange: 0,
    profitChange: 0,
    avgChange: 0,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Sales Analytics" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Period Selector */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Revenue Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Track revenue, sales volume, and profit over time.</p>
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-card p-1">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Gross Revenue"
            value={formatCurrency(stats.totalRevenue)}
            change={`${Math.abs(stats.revenueChange).toFixed(1)}% vs last period`}
            changeType={stats.revenueChange >= 0 ? 'positive' : 'negative'}
            icon={DollarSign}
            variant="primary"
          />
          <KPICard
            title="Sales Volume"
            value={stats.totalSales}
            change={`${Math.abs(stats.salesChange).toFixed(1)}% vs last period`}
            changeType={stats.salesChange >= 0 ? 'positive' : 'negative'}
            icon={Activity}
            variant="success"
          />
          <KPICard
            title="Net Earnings"
            value={formatCurrency(stats.totalProfit)}
            change={`${Math.abs(stats.profitChange).toFixed(1)}% vs last period`}
            changeType={stats.profitChange >= 0 ? 'positive' : 'negative'}
            icon={TrendingUp}
            variant="info"
          />
          <KPICard
            title="Avg. Basket"
            value={formatCurrency(stats.avgTransaction)}
            change="Per transaction"
            icon={BarChart3}
            variant="neutral"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-md bg-chart-1/10 p-2">
                <TrendingUp className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Revenue Trend</h3>
                <p className="text-sm text-muted-foreground">Revenue over the selected period</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip content={<CustomTooltip formatter={(v: number) => formatCurrency(Number(v))} />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-md bg-chart-2/10 p-2">
                <BarChart3 className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Sales vs Profit</h3>
                <p className="text-sm text-muted-foreground">Volume and profit comparison</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }} />
                <Bar dataKey="sales" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} name="Volume" />
                <Bar dataKey="profit" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
