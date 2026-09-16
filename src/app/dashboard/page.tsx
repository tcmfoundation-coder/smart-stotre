'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { KPICard } from '@/components/ui/kpi-card';
import { DashboardCharts } from '@/components/dashboard-charts';
import { ExecutiveHero } from '@/components/executive-hero';
import { QuickActions } from '@/components/quick-actions';
import { AlertCard } from '@/components/alert-card';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Users,
  Wallet,
  Bell,
  Clock,
  Receipt,
  BarChart3,
  Truck,
  Building2,
  UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { getDashboardCards, UserRole } from '@/lib/rbac';
import { useDashboardStats, useSalesData, useLowStockAlerts, useExpiringItems } from '@/hooks/useDashboard';
import { useCurrentShift } from '@/hooks/useShifts';
import { DashboardSkeleton } from '@/components/loading/DashboardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ChartSkeleton } from '@/components/loading/ChartSkeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [salesTimeFilter, setSalesTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const role = (session?.user?.role as UserRole) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const dashboardCards = getDashboardCards(role);

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: currentShift } = useCurrentShift();
  const { data: salesData, isLoading: salesLoading, error: salesError } = useSalesData(salesTimeFilter);
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockAlerts();
  const { data: expiringItems, isLoading: expiringLoading } = useExpiringItems();

  const displayLowStockItems = lowStockItems ?? [];
  const displayExpiringItems = expiringItems ?? [];

  const handleExportTransactionLog = () => {
    const transactions = stats?.recentTransactions ?? [];
    if (transactions.length === 0) {
      toast.info('No recent transactions to export yet');
      return;
    }

    let csv = 'Transaction ID,Customer,Authorized By,Net Amount,Method,Timestamp\n';
    transactions.forEach((transaction: any) => {
      const row = [
        transaction.saleNumber ?? 'N/A',
        transaction.customerName ?? 'Walk-in Customer',
        transaction.cashierId?.name ?? 'Automated',
        transaction.total ?? 0,
        transaction.paymentMethod ?? 'Unknown',
        transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'Unknown',
      ];
      csv += row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Transaction log exported successfully');
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title={roleConfig.title} userRole={role} />
      
      <main className="py-4 sm:py-6 lg:py-8">
        {roleConfig.showExecutiveHero && (
          <ErrorBoundary>
            <ExecutiveHero
              userName={roleConfig.roleLabel}
              todayRevenue={stats?.todayRevenue ?? 0}
              todaySalesCount={stats?.todaySalesCount ?? 0}
              onNewSale={() => router.push('/dashboard/pos')}
              onAddProduct={() => router.push('/dashboard/inventory/new')}
              onReceiveStock={() => router.push('/dashboard/inventory')}
            />
          </ErrorBoundary>
        )}

        <QuickActions
          onNewSale={() => router.push('/dashboard/pos')}
          onAddProduct={() => router.push('/dashboard/inventory/new')}
          onReceiveStock={() => router.push('/dashboard/inventory')}
          onGenerateReport={() => router.push('/dashboard/sales')}
          onRecordExpense={() => router.push('/dashboard/expenses')}
          onPrintReceipt={() => router.push('/dashboard/receipts')}
          allowedActions={roleConfig.quickActions}
        />

        {/* KPI Cards - Role Specific */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dashboardCards.includes('totalRevenue') && (
            <KPICard
              title="Total Revenue"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
              change="All time"
              icon={DollarSign}
              variant="primary"
              trend={12}
            />
          )}
          {dashboardCards.includes('todaySales') && (
            <KPICard
              title="Today's Sales"
              value={formatCurrency(stats?.todayRevenue ?? 0)}
              change={`${stats?.todaySalesCount ?? 0} transactions`}
              icon={ShoppingCart}
              variant="primary"
              trend={8}
            />
          )}
          {dashboardCards.includes('weeklySales') && (
            <KPICard
              title="Weekly Sales"
              value={formatCurrency(stats?.weeklyRevenue ?? 0)}
              change="This week"
              icon={BarChart3}
              variant="primary"
              trend={5}
            />
          )}
          {dashboardCards.includes('monthlySales') && (
            <KPICard
              title="Monthly Sales"
              value={formatCurrency(stats?.monthlyRevenue ?? 0)}
              change={`${(stats?.revenueChange ?? 0) >= 0 ? '+' : ''}${((stats?.revenueChange ?? 0)).toFixed(1)}% vs last month`}
              changeType={(stats?.revenueChange ?? 0) >= 0 ? 'positive' : 'negative'}
              icon={TrendingUp}
              variant="primary"
              trend={stats?.revenueChange ?? 0}
            />
          )}
          {dashboardCards.includes('totalProducts') && (
            <KPICard title="Total Products" value={stats?.totalProducts ?? 0} change="In catalog" icon={Package} variant="neutral" />
          )}
          {dashboardCards.includes('lowStockProducts') && (
            <KPICard
              title="Low Stock Alert"
              value={stats?.lowStockProducts ?? 0}
              change="Need attention"
              changeType="negative"
              icon={AlertTriangle}
              variant="warning"
            />
          )}
          {dashboardCards.includes('outOfStockProducts') && (
            <KPICard
              title="Out of Stock"
              value={stats?.outOfStockProducts ?? 0}
              change="Restock required"
              changeType="negative"
              icon={AlertTriangle}
              variant="destructive"
            />
          )}
          {dashboardCards.includes('totalEmployees') && (
            <KPICard title="Total Employees" value={stats?.totalEmployees ?? 0} change="Active staff" icon={UserCheck} variant="neutral" />
          )}
          {dashboardCards.includes('totalCustomers') && (
            <KPICard title="Total Customers" value={stats?.totalCustomers ?? 0} change="Registered base" icon={Users} variant="neutral" />
          )}
          {dashboardCards.includes('pendingPurchaseOrders') && (
            <KPICard
              title="Pending Orders"
              value={stats?.pendingPurchaseOrders ?? 0}
              change="Awaiting delivery"
              icon={Truck}
              variant="warning"
            />
          )}
          {dashboardCards.includes('totalSuppliers') && (
            <KPICard title="Total Suppliers" value={stats?.totalSuppliers ?? 0} change="Active partners" icon={Building2} variant="neutral" />
          )}
          {dashboardCards.includes('numberOfTransactions') && (
            <KPICard title="Transactions" value={stats?.todaySalesCount ?? 0} change="Today" icon={Receipt} variant="neutral" />
          )}
          {dashboardCards.includes('itemsSoldToday') && (
            <KPICard title="Items Sold" value={stats?.itemsSoldToday ?? 0} change="Today" icon={Package} variant="neutral" />
          )}
          {dashboardCards.includes('currentShiftSales') && (
            <KPICard
              title="Shift Sales"
              value={formatCurrency(currentShift?.salesTotal ?? 0)}
              change={currentShift ? 'Current shift' : 'No open shift'}
              icon={DollarSign}
              variant="primary"
            />
          )}
          {dashboardCards.includes('lowStockAlerts') && (
            <KPICard
              title="Low Stock"
              value={stats?.lowStockProducts ?? 0}
              change="Alerts"
              changeType="negative"
              icon={AlertTriangle}
              variant="warning"
            />
          )}
          {dashboardCards.includes('outOfStockItems') && (
            <KPICard
              title="Out of Stock"
              value={stats?.outOfStockProducts ?? 0}
              change="Items"
              changeType="negative"
              icon={AlertTriangle}
              variant="destructive"
            />
          )}
          {dashboardCards.includes('activeSuppliers') && (
            <KPICard title="Active Suppliers" value={stats?.activeSuppliers ?? 0} change="Partners" icon={Truck} variant="neutral" />
          )}
          {dashboardCards.includes('customerCount') && (
            <KPICard title="Customers" value={stats?.totalCustomers ?? 0} change="Registered" icon={Users} variant="neutral" />
          )}
        </div>

        {roleConfig.showInventoryAlerts && (
          <ErrorBoundary>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AlertCard
                title="Restock Required"
                icon={AlertTriangle}
                variant="warning"
                items={displayLowStockItems}
                type="restock"
                onViewAll={() => router.push('/dashboard/inventory')}
              />
              <AlertCard
                title="Expiry Risk"
                icon={Clock}
                variant="warning"
                items={displayExpiringItems}
                type="expiry"
                onViewAll={() => router.push('/dashboard/inventory')}
              />
              <KPICard title="Loyal Customers" value={stats?.totalCustomers ?? 0} change="Registered base" icon={Users} variant="neutral" />
            </div>
          </ErrorBoundary>
        )}

        {roleConfig.showCharts && (
          <ErrorBoundary>
            {salesLoading ? (
              <ChartSkeleton />
            ) : salesError ? (
              <div className="bg-card rounded-xl border border-destructive/50 p-6 text-center">
                <p className="text-destructive">Failed to load sales chart</p>
              </div>
            ) : (
              <DashboardCharts
                salesData={salesData ?? []}
                timeFilter={salesTimeFilter}
                onTimeFilterChange={setSalesTimeFilter}
              />
            )}
          </ErrorBoundary>
        )}

        {roleConfig.showRecentTransactions && (
          <ErrorBoundary>
            <div className="mt-8 rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Real-time update from all terminals</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportTransactionLog}>
                  Export Log
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer / Entity</TableHead>
                    <TableHead>Authorized By</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.recentTransactions ?? []).map((transaction: any, index: number) => (
                    <TableRow key={transaction._id ?? index}>
                      <TableCell className="font-medium text-foreground">{transaction.saleNumber ?? 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                            {(transaction.customerName ?? 'WI').substring(0, 2)}
                          </div>
                          <span className="font-medium text-foreground">{transaction.customerName ?? 'Walk-in Customer'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{transaction.cashierId?.name ?? 'Automated'}</TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(transaction.total ?? 0)}</TableCell>
                      <TableCell>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                          {transaction.paymentMethod ?? 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.createdAt
                          ? new Date(transaction.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
