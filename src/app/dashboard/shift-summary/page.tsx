'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DollarSign, ShoppingCart, Clock, TrendingDown, Loader2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { KPICard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useCurrentShift, useShifts, useOpenShift, useCloseShift } from '@/hooks/useShifts';

export default function ShiftSummaryPage() {
  const { data: currentShift, isLoading: currentLoading } = useCurrentShift();
  const { data: pastShifts, isLoading: historyLoading } = useShifts({ status: 'closed' });
  const openShift = useOpenShift();
  const closeShift = useCloseShift();

  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);

  const handleOpen = async () => {
    const value = parseFloat(openingCash);
    if (Number.isNaN(value) || value < 0) return;
    await openShift.mutateAsync(value);
    setOpeningCash('');
  };

  const handleClose = async () => {
    if (!currentShift) return;
    const value = parseFloat(actualCash);
    if (Number.isNaN(value) || value < 0) return;
    await closeShift.mutateAsync({ id: currentShift.id, actualCash: value });
    setActualCash('');
    setShowCloseForm(false);
  };

  if (currentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Shift Summary" userRole="cashier" />
        <main className="flex h-64 items-center justify-center p-6 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Shift Summary" userRole="cashier" />

      <main className="space-y-6 p-6 lg:p-8">
        {!currentShift ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">No Open Shift</h2>
              <p className="mb-6 text-muted-foreground">Open a shift to start tracking sales and cash for this session.</p>
              <div className="mx-auto max-w-xs space-y-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Opening cash balance"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="text-center"
                />
                <Button className="w-full" onClick={handleOpen} disabled={openShift.isPending || !openingCash} isLoading={openShift.isPending}>
                  {!openShift.isPending && 'Open Shift'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Shift Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Open Shift</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Opened by: {currentShift.openedByName}</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowCloseForm((v) => !v)}>
                    Close Shift
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Opened {new Date(currentShift.openedAt).toLocaleString()}</span>
                  </div>
                </div>

                {showCloseForm && (
                  <div className="mt-6 max-w-sm border-t border-border pt-6">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Expected cash in drawer: <span className="font-semibold text-foreground">{formatCurrency(currentShift.expectedCash ?? 0)}</span>
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Actual counted cash"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                      />
                      <Button onClick={handleClose} disabled={closeShift.isPending || !actualCash} isLoading={closeShift.isPending}>
                        {!closeShift.isPending && 'Confirm'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard title="Sales This Shift" value={formatCurrency(currentShift.salesTotal)} change="This shift" icon={DollarSign} variant="success" />
              <KPICard title="Transactions" value={currentShift.salesCount} change="This shift" icon={ShoppingCart} variant="info" />
              <KPICard title="Refunds" value={formatCurrency(currentShift.refundsTotal)} change="This shift" icon={TrendingDown} variant="destructive" />
              <KPICard title="Opening Cash" value={formatCurrency(currentShift.openingCashBalance)} change="Session start" icon={Wallet} variant="primary" />
            </div>

            {/* Payment Methods */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-base font-semibold text-foreground">Payment Methods This Shift</h3>
                <div className="space-y-4">
                  {(['cash', 'card', 'transfer', 'paystack'] as const).map((method) => {
                    const amount = currentShift.paymentMethodTotals[method];
                    const pct = currentShift.salesTotal > 0 ? (amount / currentShift.salesTotal) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium capitalize text-foreground">{method}</span>
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Shift History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">Recent Closed Shifts</h3>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (pastShifts ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No closed shifts yet</p>
            ) : (
              <div className="space-y-3">
                {(pastShifts ?? []).map((shift) => {
                  const balanced = Math.abs(shift.cashVariance ?? 0) < 0.01;
                  return (
                    <div key={shift.id} className="flex items-center justify-between rounded-md border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{shift.openedByName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(shift.openedAt).toLocaleString()} - {shift.closedAt && new Date(shift.closedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(shift.salesTotal)}</p>
                        <Badge variant={balanced ? 'success' : 'warning'} className="mt-1 gap-1">
                          {balanced ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {(shift.cashVariance ?? 0) >= 0 ? '+' : ''}
                          {formatCurrency(shift.cashVariance ?? 0)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
