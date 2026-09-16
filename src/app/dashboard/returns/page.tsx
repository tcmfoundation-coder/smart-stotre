'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ArrowLeftRight, Search, Receipt, Calendar, User, Package, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useReturns,
  useProcessReturn,
  lookupSaleForReturn,
  type ReturnRecord,
  type SaleLookupResult,
} from '@/hooks/useReturns';

interface DraftLine {
  productId: string;
  productName: string;
  sku: string;
  quantityReturnable: number;
  unitRefundPrice: number;
  quantity: number;
  reason: string;
  restock: boolean;
}

export default function ReturnsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);

  const [saleNumberInput, setSaleNumberInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<SaleLookupResult | null>(null);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'transfer' | 'paystack'>('cash');

  const { data: returns, isLoading, error, refetch } = useReturns({ search: searchQuery });
  const processReturn = useProcessReturn();

  const handleLookup = async () => {
    if (!saleNumberInput.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const result = await lookupSaleForReturn(saleNumberInput.trim());
      setLookupResult(result);
      setDraftLines(
        result.items
          .filter((item) => item.quantityReturnable > 0)
          .map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantityReturnable: item.quantityReturnable,
            unitRefundPrice: item.unitRefundPrice,
            quantity: 0,
            reason: '',
            restock: true,
          }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sale not found');
    } finally {
      setLookupLoading(false);
    }
  };

  const updateLine = (productId: string, patch: Partial<DraftLine>) => {
    setDraftLines((lines) => lines.map((line) => (line.productId === productId ? { ...line, ...patch } : line)));
  };

  const activeLines = draftLines.filter((line) => line.quantity > 0);
  const draftTotal = activeLines.reduce((sum, line) => sum + line.unitRefundPrice * line.quantity, 0);

  const closeNewReturn = () => {
    setIsNewReturnOpen(false);
    setSaleNumberInput('');
    setLookupResult(null);
    setDraftLines([]);
    setRefundMethod('cash');
  };

  const handleSubmit = async () => {
    if (!lookupResult) return;
    if (activeLines.length === 0) {
      toast.error('Enter a quantity for at least one item');
      return;
    }
    if (activeLines.some((line) => !line.reason.trim())) {
      toast.error('Every returned item needs a reason');
      return;
    }

    try {
      await processReturn.mutateAsync({
        saleId: lookupResult.saleId,
        refundMethod,
        items: activeLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          reason: line.reason,
          restock: line.restock,
        })),
      });
      closeNewReturn();
      refetch();
    } catch {
      // Error toast is handled by the mutation hook.
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Returns & Refunds" userRole="cashier" />

      <main className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search returns by number, sale, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <Button className="w-full gap-2 sm:w-auto" onClick={() => setIsNewReturnOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
            New Return
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <ErrorState description="Failed to load returns" onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Returns List */}
            <div className="space-y-4 lg:col-span-2">
              {(returns ?? []).length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No returns found" description="Processed returns will appear here" />
              ) : (
                (returns ?? []).map((returnItem) => (
                  <Card
                    key={returnItem.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      selectedReturn?.id === returnItem.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedReturn(returnItem)}
                  >
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{returnItem.returnNumber}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Sale: {returnItem.saleNumber}</p>
                        </div>
                        <Badge variant="success">Completed</Badge>
                      </div>

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{returnItem.customerName || 'Walk-in Customer'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{returnItem.items.length} item(s)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{formatCurrency(returnItem.totalRefund)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(returnItem.date).toLocaleDateString()}</span>
                        </div>
                        <span>By {returnItem.processedBy}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Return Details */}
            <div className="lg:col-span-1">
              {selectedReturn ? (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Return Details</h3>

                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Return Number</p>
                        <p className="font-semibold text-foreground">{selectedReturn.returnNumber}</p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Original Sale</p>
                        <p className="font-semibold text-foreground">{selectedReturn.saleNumber}</p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Customer</p>
                        <p className="font-semibold text-foreground">{selectedReturn.customerName || 'Walk-in Customer'}</p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">Items Returned</p>
                        <div className="space-y-2">
                          {selectedReturn.items.map((item, idx) => (
                            <div key={idx} className="rounded-md border border-border p-3">
                              <p className="text-sm font-medium text-foreground">{item.productName}</p>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                <span className="text-xs text-muted-foreground">{item.reason}</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {item.restocked ? 'Restocked' : 'Not restocked'}
                                </span>
                                <span className="text-xs font-semibold text-foreground">{formatCurrency(item.refundAmount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Refund</span>
                          <span className="text-lg font-semibold text-foreground">{formatCurrency(selectedReturn.totalRefund)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Refund Method</span>
                          <span className="font-medium capitalize text-foreground">{selectedReturn.refundMethod}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState icon={ArrowLeftRight} title="No return selected" description="Select a return to view details" />
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Return flow */}
      <Dialog open={isNewReturnOpen} onOpenChange={(open) => !open && closeNewReturn()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Return</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter sale number (e.g. SALE-1234567890)"
                value={saleNumberInput}
                onChange={(e) => setSaleNumberInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button onClick={handleLookup} disabled={lookupLoading || !saleNumberInput.trim()} isLoading={lookupLoading}>
                {!lookupLoading && 'Look Up'}
              </Button>
            </div>

            {lookupResult && (
              <>
                <div className="rounded-md border border-border p-4 text-sm">
                  <div className="mb-1 flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-semibold text-foreground">{lookupResult.customerName || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refundable remaining on this sale</span>
                    <span className="font-semibold text-foreground">{formatCurrency(lookupResult.totalRefundable)}</span>
                  </div>
                </div>

                {draftLines.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Every item on this sale has already been fully returned.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {draftLines.map((line) => (
                      <div key={line.productId} className="space-y-3 rounded-md border border-border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{line.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(line.unitRefundPrice)}/unit · up to {line.quantityReturnable} returnable
                            </p>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            max={line.quantityReturnable}
                            value={line.quantity}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value, 10) || 0;
                              const qty = Math.max(0, Math.min(raw, line.quantityReturnable));
                              updateLine(line.productId, { quantity: qty });
                            }}
                            className="w-20 text-center"
                          />
                        </div>
                        {line.quantity > 0 && (
                          <>
                            <Input
                              type="text"
                              placeholder="Reason (e.g. Damaged, Wrong item)"
                              value={line.reason}
                              onChange={(e) => updateLine(line.productId, { reason: e.target.value })}
                            />
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={line.restock}
                                onChange={(e) => updateLine(line.productId, { restock: e.target.checked })}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                              Return to sellable stock
                            </label>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {draftLines.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="refund-method">Refund Method</Label>
                      <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as typeof refundMethod)}>
                        <SelectTrigger id="refund-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="paystack">Paystack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-sm text-muted-foreground">Total Refund</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(draftTotal)}</span>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={closeNewReturn}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={processReturn.isPending || activeLines.length === 0}
                        isLoading={processReturn.isPending}
                      >
                        {!processReturn.isPending && 'Process Return'}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
