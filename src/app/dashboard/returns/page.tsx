'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ArrowLeftRight, Search, Receipt, Calendar, User, Package, DollarSign, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Returns & Refunds" userRole="cashier" />

      <main className="py-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search returns by number, sale, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsNewReturnOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              New Return
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">Failed to load returns</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Returns List */}
            <div className="lg:col-span-2 space-y-4">
              {(returns ?? []).map((returnItem, index) => (
                <motion.div
                  key={returnItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedReturn?.id === returnItem.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedReturn(returnItem)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Receipt className="h-4 w-4 text-primary" />
                            <span className="font-bold text-foreground">{returnItem.returnNumber}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Sale: {returnItem.saleNumber}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          COMPLETED
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
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
                          <span className="text-foreground font-bold">{formatCurrency(returnItem.totalRefund)}</span>
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
                </motion.div>
              ))}

              {(returns ?? []).length === 0 && (
                <div className="text-center py-16">
                  <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No returns found</p>
                </div>
              )}
            </div>

            {/* Return Details */}
            <div className="lg:col-span-1">
              {selectedReturn ? (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Return Details</h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Return Number</p>
                        <p className="font-semibold text-foreground">{selectedReturn.returnNumber}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Original Sale</p>
                        <p className="font-semibold text-foreground">{selectedReturn.saleNumber}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Customer</p>
                        <p className="font-semibold text-foreground">{selectedReturn.customerName || 'Walk-in Customer'}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Items Returned</p>
                        <div className="space-y-2">
                          {selectedReturn.items.map((item, idx) => (
                            <div key={idx} className="bg-secondary/50 rounded-lg p-3">
                              <p className="font-medium text-foreground text-sm">{item.productName}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                <span className="text-xs text-muted-foreground">{item.reason}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {item.restocked ? 'Restocked' : 'Not restocked'}
                                </span>
                                <span className="text-xs font-semibold text-foreground">{formatCurrency(item.refundAmount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Total Refund</span>
                          <span className="text-lg font-bold text-foreground">{formatCurrency(selectedReturn.totalRefund)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Refund Method</span>
                          <span className="font-medium text-foreground capitalize">{selectedReturn.refundMethod}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select a return to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Return flow */}
      {isNewReturnOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl shadow-2xl border border-border max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-foreground uppercase">New Return</h3>
              <button onClick={closeNewReturn} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter sale number (e.g. SALE-1234567890)"
                  value={saleNumberInput}
                  onChange={(e) => setSaleNumberInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="flex-1 px-4 py-3 bg-secondary/50 border-none rounded-xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none"
                />
                <Button onClick={handleLookup} disabled={lookupLoading || !saleNumberInput.trim()}>
                  {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
                </Button>
              </div>

              {lookupResult && (
                <>
                  <div className="bg-secondary/30 rounded-xl p-4 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-semibold text-foreground">{lookupResult.customerName || 'Walk-in Customer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refundable remaining on this sale</span>
                      <span className="font-semibold text-foreground">{formatCurrency(lookupResult.totalRefundable)}</span>
                    </div>
                  </div>

                  {draftLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Every item on this sale has already been fully returned.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {draftLines.map((line) => (
                        <div key={line.productId} className="border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{line.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(line.unitRefundPrice)}/unit · up to {line.quantityReturnable} returnable
                              </p>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={line.quantityReturnable}
                              value={line.quantity}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value, 10) || 0;
                                const qty = Math.max(0, Math.min(raw, line.quantityReturnable));
                                updateLine(line.productId, { quantity: qty });
                              }}
                              className="w-20 px-3 py-2 bg-secondary/50 border-none rounded-lg text-center font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/10"
                            />
                          </div>
                          {line.quantity > 0 && (
                            <>
                              <input
                                type="text"
                                placeholder="Reason (e.g. Damaged, Wrong item)"
                                value={line.reason}
                                onChange={(e) => updateLine(line.productId, { reason: e.target.value })}
                                className="w-full px-3 py-2 bg-secondary/50 border-none rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/10"
                              />
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={line.restock}
                                  onChange={(e) => updateLine(line.productId, { restock: e.target.checked })}
                                  className="rounded border-border"
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
                        <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                          Refund Method
                        </label>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                          className="w-full px-4 py-3 bg-secondary/50 border-none rounded-xl text-foreground font-semibold outline-none focus:ring-2 focus:ring-ring/10"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="transfer">Transfer</option>
                          <option value="paystack">Paystack</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-sm text-muted-foreground">Total Refund</span>
                        <span className="text-xl font-bold text-foreground">{formatCurrency(draftTotal)}</span>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={closeNewReturn}>
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleSubmit}
                          disabled={processReturn.isPending || activeLines.length === 0}
                        >
                          {processReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Process Return'}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
