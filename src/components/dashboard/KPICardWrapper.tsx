'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LucideIcon } from 'lucide-react';

interface KPICardWrapperProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
  trend?: number;
  isLoading?: boolean;
  error?: string;
}

export function KPICardWrapper({
  title,
  value,
  change,
  changeType,
  icon,
  variant,
  trend,
  isLoading,
  error,
}: KPICardWrapperProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="rounded-lg border border-destructive/50 bg-card p-6">
          <p className="text-sm text-destructive">Failed to load</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <KPICard
        title={title}
        value={value}
        change={change}
        changeType={changeType}
        icon={icon}
        variant={variant}
        trend={trend}
      />
    </ErrorBoundary>
  );
}
