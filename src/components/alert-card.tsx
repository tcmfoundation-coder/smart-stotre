import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Package, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertItem {
  id: string;
  name: string;
  quantity: number;
  severity?: 'low' | 'medium' | 'high';
}

type AlertVariant = 'warning' | 'destructive';

interface AlertCardProps {
  title: string;
  icon: LucideIcon;
  variant?: AlertVariant;
  items: AlertItem[];
  onViewAll?: () => void;
  type: 'restock' | 'expiry';
}

const VARIANT_STYLES: Record<AlertVariant, string> = {
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function AlertCard({ title, icon: Icon, variant = 'warning', items, onViewAll, type }: AlertCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-md p-3', VARIANT_STYLES[variant])}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {items.length} item{items.length !== 1 ? 's' : ''} require attention
              </p>
            </div>
          </div>
          <Badge variant={items.length > 5 ? 'destructive' : items.length > 2 ? 'warning' : 'secondary'}>
            {items.length}
          </Badge>
        </div>

        <div className="mb-4 space-y-2">
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md bg-muted/40 p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {type === 'restock' ? `${item.quantity} left in stock` : `${item.quantity}d left`}
                  </p>
                </div>
              </div>
              <Badge
                variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'warning' : 'secondary'}
                className="text-[10px]"
              >
                {type === 'restock' ? `${item.quantity} left` : `${item.quantity}d left`}
              </Badge>
            </div>
          ))}
        </div>

        {items.length > 3 && (
          <Button variant="ghost" onClick={onViewAll} className="group w-full gap-2">
            View All {items.length} Items
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
