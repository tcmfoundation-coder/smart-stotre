import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KPIVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  variant?: KPIVariant;
  trend?: number;
}

const VARIANT_STYLES: Record<KPIVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
};

// Strips a trailing ".00" from formatted currency so "N0.00" reads as "N0".
function formatValue(val: string | number) {
  if (typeof val === 'number') return val.toLocaleString();
  return val.includes('.00') ? val.replace('.00', '') : val;
}

export function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'neutral',
  trend,
}: KPICardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{formatValue(value)}</h2>
            {trend !== undefined && (
              <span className={cn('text-sm font-medium', trend >= 0 ? 'text-success' : 'text-destructive')}>
                {trend >= 0 ? '+' : ''}
                {trend}%
              </span>
            )}
          </div>
          {change && (
            <span
              className={cn(
                'mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                changeType === 'positive'
                  ? 'border-success/20 bg-success/10 text-success'
                  : changeType === 'negative'
                    ? 'border-destructive/20 bg-destructive/10 text-destructive'
                    : 'border-border bg-secondary text-muted-foreground'
              )}
            >
              {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '•'} {change}
            </span>
          )}
        </div>

        <div className={cn('rounded-md p-3', VARIANT_STYLES[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
