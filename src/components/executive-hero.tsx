import { Button } from './ui/button';
import { Plus, ShoppingCart, Package } from 'lucide-react';

interface ExecutiveHeroProps {
  userName?: string;
  todayRevenue: number;
  todaySalesCount: number;
  onNewSale?: () => void;
  onAddProduct?: () => void;
  onReceiveStock?: () => void;
}

export function ExecutiveHero({
  userName = 'Admin',
  todayRevenue,
  todaySalesCount,
  onNewSale,
  onAddProduct,
  onReceiveStock,
}: ExecutiveHeroProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="mb-8 rounded-lg border border-border bg-muted/30 p-8">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">
        {getGreeting()}, {userName}
      </h1>
      <p className="mb-6 text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening in your business today.</p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s Revenue</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-foreground">{formatCurrency(todayRevenue)}</h2>
            <span className="text-sm font-medium text-success">+{todaySalesCount} Sales Today</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onNewSale} className="gap-2">
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
          <Button variant="secondary" onClick={onAddProduct} className="gap-2">
            <Package className="h-4 w-4" />
            Add Product
          </Button>
          <Button variant="outline" onClick={onReceiveStock} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Receive Stock
          </Button>
        </div>
      </div>
    </div>
  );
}
