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
import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4
    }
  }
};

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
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {dashboardCards.includes('totalRevenue') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Total Revenue"
                value={formatCurrency(stats?.totalRevenue ?? 0)}
                change="All time"
                icon={DollarSign}
                iconColor="text-emerald-600"
                trend={12}
              />
            </motion.div>
          )}
          {dashboardCards.includes('todaySales') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Today's Sales"
                value={formatCurrency(stats?.todayRevenue ?? 0)}
                change={`${stats?.todaySalesCount ?? 0} transactions`}
                icon={ShoppingCart}
                iconColor="text-blue-600"
                trend={8}
              />
            </motion.div>
          )}
          {dashboardCards.includes('weeklySales') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Weekly Sales"
                value={formatCurrency(stats?.weeklyRevenue ?? 0)}
                change="This week"
                icon={BarChart3}
                iconColor="text-purple-600"
                trend={5}
              />
            </motion.div>
          )}
          {dashboardCards.includes('monthlySales') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Monthly Sales"
                value={formatCurrency(stats?.monthlyRevenue ?? 0)}
                change={`${(stats?.revenueChange ?? 0) >= 0 ? '+' : ''}${((stats?.revenueChange ?? 0)).toFixed(1)}% vs last month`}
                changeType={(stats?.revenueChange ?? 0) >= 0 ? 'positive' : 'negative'}
                icon={TrendingUp}
                iconColor="text-indigo-600"
                trend={stats?.revenueChange ?? 0}
              />
            </motion.div>
          )}
          {dashboardCards.includes('totalProducts') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Total Products"
                value={stats?.totalProducts ?? 0}
                change="In catalog"
                icon={Package}
                iconColor="text-cyan-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('lowStockProducts') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Low Stock Alert"
                value={stats?.lowStockProducts ?? 0}
                change="Need attention"
                changeType="negative"
                icon={AlertTriangle}
                iconColor="text-orange-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('outOfStockProducts') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Out of Stock"
                value={stats?.outOfStockProducts ?? 0}
                change="Restock required"
                changeType="negative"
                icon={AlertTriangle}
                iconColor="text-red-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('totalEmployees') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Total Employees"
                value={stats?.totalEmployees ?? 0}
                change="Active staff"
                icon={UserCheck}
                iconColor="text-blue-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('totalCustomers') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Total Customers"
                value={stats?.totalCustomers ?? 0}
                change="Registered base"
                icon={Users}
                iconColor="text-green-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('pendingPurchaseOrders') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Pending Orders"
                value={stats?.pendingPurchaseOrders ?? 0}
                change="Awaiting delivery"
                icon={Truck}
                iconColor="text-amber-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('totalSuppliers') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Total Suppliers"
                value={stats?.totalSuppliers ?? 0}
                change="Active partners"
                icon={Building2}
                iconColor="text-teal-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('numberOfTransactions') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Transactions"
                value={stats?.todaySalesCount ?? 0}
                change="Today"
                icon={Receipt}
                iconColor="text-violet-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('itemsSoldToday') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Items Sold"
                value={stats?.itemsSoldToday ?? 0}
                change="Today"
                icon={Package}
                iconColor="text-pink-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('currentShiftSales') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Shift Sales"
                value={formatCurrency(currentShift?.salesTotal ?? 0)}
                change={currentShift ? 'Current shift' : 'No open shift'}
                icon={DollarSign}
                iconColor="text-emerald-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('lowStockAlerts') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Low Stock"
                value={stats?.lowStockProducts ?? 0}
                change="Alerts"
                changeType="negative"
                icon={AlertTriangle}
                iconColor="text-orange-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('outOfStockItems') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Out of Stock"
                value={stats?.outOfStockProducts ?? 0}
                change="Items"
                changeType="negative"
                icon={AlertTriangle}
                iconColor="text-red-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('activeSuppliers') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Active Suppliers"
                value={stats?.activeSuppliers ?? 0}
                change="Partners"
                icon={Truck}
                iconColor="text-teal-600"
              />
            </motion.div>
          )}
          {dashboardCards.includes('customerCount') && (
            <motion.div variants={itemVariants}>
              <KPICard
                title="Customers"
                value={stats?.totalCustomers ?? 0}
                change="Registered"
                icon={Users}
                iconColor="text-green-600"
              />
            </motion.div>
          )}
        </motion.div>

        {roleConfig.showInventoryAlerts && (
          <ErrorBoundary>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
            <motion.div variants={itemVariants}>
              <AlertCard
                title="Restock Required"
                icon={AlertTriangle}
                iconColor="text-orange-600"
                items={displayLowStockItems}
                type="restock"
                onViewAll={() => router.push('/dashboard/inventory')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AlertCard
                title="Expiry Risk"
                icon={Clock}
                iconColor="text-rose-600"
                items={displayExpiringItems}
                type="expiry"
                onViewAll={() => router.push('/dashboard/inventory')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title="Loyal Customers"
                value={stats?.totalCustomers ?? 0}
                change="Registered base"
                icon={Users}
                iconColor="text-cyan-600"
              />
            </motion.div>
            </motion.div>
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
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden mt-8 hover:shadow-2xl transition-shadow duration-300"
            >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Transactions</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">Real-time update from all terminals</p>
              </div>
              <button
                onClick={handleExportTransactionLog}
                className="px-6 py-3 bg-secondary text-muted-foreground font-bold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all text-sm uppercase tracking-wider hover:scale-105 active:scale-95"
              >
                Export Log
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer / Entity</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Authorized By</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Amount</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Method</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(stats?.recentTransactions ?? []).map((transaction: any, index: number) => (
                    <motion.tr
                      key={transaction._id ?? index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + (index * 0.05) }}
                      className="group hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{transaction.saleNumber ?? 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground uppercase group-hover:scale-110 transition-transform">
                            {(transaction.customerName ?? 'WI').substring(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{transaction.customerName ?? 'Walk-in Customer'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold text-muted-foreground">{transaction.cashierId?.name ?? 'Automated'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold text-foreground">{formatCurrency(transaction.total ?? 0)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-wider border border-primary/20 group-hover:scale-105 transition-transform">
                          {transaction.paymentMethod ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {transaction.createdAt 
                            ? new Date(transaction.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Unknown'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            </motion.div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
