'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DollarSign, ShoppingCart, Clock, TrendingDown, Loader2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Shift Summary" userRole="cashier" />

      <main className="py-6 space-y-6">
        {!currentShift ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No Open Shift</h2>
              <p className="text-muted-foreground mb-6">Open a shift to start tracking sales and cash for this session.</p>
              <div className="max-w-xs mx-auto space-y-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Opening cash balance"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/50 border-none rounded-xl text-center font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/10"
                />
                <Button className="w-full" onClick={handleOpen} disabled={openShift.isPending || !openingCash}>
                  {openShift.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open Shift'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Shift Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Open Shift</h2>
                      <p className="text-muted-foreground mt-1">Opened by: {currentShift.openedByName}</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowCloseForm((v) => !v)}>
                      Close Shift
                    </Button>
                  </div>

                  <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Opened {new Date(currentShift.openedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {showCloseForm && (
                    <div className="mt-6 pt-6 border-t border-border max-w-sm">
                      <p className="text-sm text-muted-foreground mb-2">
                        Expected cash in drawer: <span className="font-bold text-foreground">{formatCurrency(currentShift.expectedCash ?? 0)}</span>
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Actual counted cash"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          className="flex-1 px-4 py-3 bg-secondary/50 border-none rounded-xl font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/10"
                        />
                        <Button onClick={handleClose} disabled={closeShift.isPending || !actualCash}>
                          {closeShift.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sales This Shift</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(currentShift.salesTotal)}</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{currentShift.salesCount}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Refunds</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(currentShift.refundsTotal)}</p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Opening Cash</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(currentShift.openingCashBalance)}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Payment Methods This Shift</h3>
                <div className="space-y-4">
                  {(['cash', 'card', 'transfer', 'paystack'] as const).map((method) => {
                    const amount = currentShift.paymentMethodTotals[method];
                    const pct = currentShift.salesTotal > 0 ? (amount / currentShift.salesTotal) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground capitalize">{method}</span>
                          <span className="text-sm font-bold text-foreground">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(pct, 0)}%` }} />
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
            <h3 className="text-lg font-bold text-foreground mb-4">Recent Closed Shifts</h3>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (pastShifts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No closed shifts yet</p>
            ) : (
              <div className="space-y-3">
                {(pastShifts ?? []).map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div>
                      <p className="font-medium text-foreground text-sm">{shift.openedByName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(shift.openedAt).toLocaleString()} - {shift.closedAt && new Date(shift.closedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(shift.salesTotal)}</p>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        {Math.abs(shift.cashVariance ?? 0) < 0.01 ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                        )}
                        <span className={Math.abs(shift.cashVariance ?? 0) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}>
                          {(shift.cashVariance ?? 0) >= 0 ? '+' : ''}
                          {formatCurrency(shift.cashVariance ?? 0)} variance
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
