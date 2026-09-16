'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50">
          <CardContent className="p-2">
            <ErrorState
              description={this.state.error?.message || 'An unexpected error occurred'}
              onRetry={this.handleRetry}
            />
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
