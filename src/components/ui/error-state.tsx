import { AlertTriangle, RefreshCw, LucideIcon } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  icon: Icon = AlertTriangle,
  title = 'Something went wrong',
  description = 'An unexpected error occurred.',
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon text-destructive/40" />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {onRetry && (
        <div className="mt-6">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
