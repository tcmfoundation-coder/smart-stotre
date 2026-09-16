import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'error' | 'success';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  const variantStyles = {
    default: 'text-muted-foreground/40',
    error: 'text-destructive/40',
    success: 'text-success/40'
  };

  return (
    <div className="empty-state">
      {Icon && (
        <div className={`empty-state-icon ${variantStyles[variant]}`}>
          <Icon className="h-full w-full" />
        </div>
      )}

      <h3 className="empty-state-title">{title}</h3>

      {description && <p className="empty-state-description">{description}</p>}

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
