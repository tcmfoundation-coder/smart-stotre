import { DashboardHeader } from '@/components/dashboard-header';
import { getCustomerAnalytics } from '@/lib/actions/customers';
import { TrendingUp, Users, DollarSign, Award, Repeat, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { connection } from 'next/server';
import { Card, CardContent } from '@/components/ui/card';
import { KPICard } from '@/components/ui/kpi-card';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalSpent: number;
  purchaseCount: number;
}

interface LoyaltyLevel {
  name: string;
  count: number;
  percentage: number;
}

interface Analytics {
  totalCustomers: number;
  totalRevenue: number;
  averageSpend: number;
  totalPoints: number;
  topSpenders: Customer[];
  frequentCustomers: Customer[];
  newCustomers: number;
  returningCustomers: number;
  returningRate: string;
  recentPurchases: number;
  loyaltyLevels: LoyaltyLevel[];
}

export default async function CustomerAnalyticsPage() {
  await connection();
  const analytics = await getCustomerAnalytics() as Analytics;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Customer Analytics" userRole="manager" />

      <main className="p-6 lg:p-8">
        {/* Key Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Customers" value={analytics.totalCustomers} change="Active accounts" icon={Users} variant="primary" />
          <KPICard title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} change="Lifetime value" icon={DollarSign} variant="success" />
          <KPICard title="Avg. Spend" value={formatCurrency(analytics.averageSpend)} change="Per customer" icon={TrendingUp} variant="info" />
          <KPICard title="Total Points" value={analytics.totalPoints} change="Loyalty points" icon={Award} variant="warning" />
        </div>

        {/* Analytics Tables */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Customers by Spending */}
          <Card className="overflow-hidden">
            <div className="border-b border-border p-6">
              <h3 className="text-base font-semibold text-foreground">Top Customers by Spending</h3>
              <p className="mt-1 text-sm text-muted-foreground">Highest lifetime value</p>
            </div>
            <div className="divide-y divide-border">
              {analytics.topSpenders.slice(0, 5).map((customer: Customer, index: number) => (
                <div key={customer._id} className="flex items-center justify-between p-4 transition-colors hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">{customer.purchaseCount} purchases</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Most Frequent Customers */}
          <Card className="overflow-hidden">
            <div className="border-b border-border p-6">
              <h3 className="text-base font-semibold text-foreground">Most Frequent Customers</h3>
              <p className="mt-1 text-sm text-muted-foreground">Highest purchase count</p>
            </div>
            <div className="divide-y divide-border">
              {analytics.frequentCustomers.slice(0, 5).map((customer: Customer, index: number) => (
                <div key={customer._id} className="flex items-center justify-between p-4 transition-colors hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-sm font-semibold text-success">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{customer.purchaseCount} visits</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(customer.totalSpent)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Customer Segments */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="mb-6 text-base font-semibold text-foreground">Customer Segments</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/30 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Repeat className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Returning Customers</h4>
                </div>
                <p className="text-2xl font-semibold text-foreground">{analytics.returningCustomers}</p>
                <p className="mt-1 text-sm text-muted-foreground">{analytics.returningRate}% of total</p>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-success" />
                  <h4 className="text-sm font-semibold text-foreground">New Customers</h4>
                </div>
                <p className="text-2xl font-semibold text-foreground">{analytics.newCustomers}</p>
                <p className="mt-1 text-sm text-muted-foreground">Last 30 days</p>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
                </div>
                <p className="text-2xl font-semibold text-foreground">{analytics.recentPurchases}</p>
                <p className="mt-1 text-sm text-muted-foreground">Purchases this week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Levels Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-6 text-base font-semibold text-foreground">Loyalty Levels Distribution</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              {analytics.loyaltyLevels.map((level: LoyaltyLevel) => (
                <div key={level.name} className="rounded-md border border-border bg-muted/30 p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold capitalize text-foreground">{level.name}</h4>
                    <span className="text-xl font-semibold text-foreground">{level.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${level.percentage}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{level.percentage}% of customers</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
