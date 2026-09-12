'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, PackageX, RefreshCw } from 'lucide-react';
import {
  useGoodsReceiptsForOrder,
  useCreateGoodsReceipt,
  useApproveOverDelivery,
  useRejectOverDelivery,
  type GoodsReceiptRecord,
} from '@/hooks/useGoodsReceipts';

interface GoodsReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: { _id: string; orderNumber: string; supplierName: string } | null;
  onSuccess?: () => void;
}

interface LineDraft {
  receivedQuantity: string;
  rejectedQuantity: string;
  reason: string;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function statusBadge(status: GoodsReceiptRecord['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'pending_approval':
      return <Badge variant="warning">Pending Approval</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Over-delivery Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function GoodsReceiptForm({ open, onOpenChange, purchaseOrder, onSuccess }: GoodsReceiptFormProps) {
  const purchaseOrderId = purchaseOrder?._id;
  const { data, isLoading, isError, refetch, isFetching } = useGoodsReceiptsForOrder(purchaseOrderId);
  const createReceipt = useCreateGoodsReceipt();
  const approveOverage = useApproveOverDelivery();
  const rejectOverage = useRejectOverDelivery();

  // No effect-driven reset needed: the parent mounts this component with a
  // `key` derived from the purchase order id, so opening the dialog for a
  // different (or newly re-selected) order always starts from a fresh
  // instance with blank state below - and a background refetch of `data`
  // while the user is mid-edit never wipes what they've typed.
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.lines.map((line) => {
      const draft = drafts[line.productId] || { receivedQuantity: '', rejectedQuantity: '0', reason: '' };
      const received = draft.receivedQuantity === '' ? 0 : Number(draft.receivedQuantity);
      const rejected = draft.rejectedQuantity === '' ? 0 : Number(draft.rejectedQuantity);
      const validQuantities =
        Number.isInteger(received) && received >= 0 && Number.isInteger(rejected) && rejected >= 0 && rejected <= received;
      const netToStock = validQuantities ? received - rejected : 0;
      const accepted = validQuantities ? Math.min(netToStock, line.remainingQuantity) : 0;
      const overDelivery = validQuantities ? Math.max(0, netToStock - line.remainingQuantity) : 0;
      return { line, draft, received, rejected, validQuantities, accepted, overDelivery };
    });
  }, [data, drafts]);

  const hasAnyInput = rows.some((r) => r.received > 0);
  const hasInvalidRow = rows.some((r) => !r.validQuantities);
  const hasOverDeliveryPreview = rows.some((r) => r.overDelivery > 0);
  const canSubmit = !!data?.canReceive && hasAnyInput && !hasInvalidRow && !createReceipt.isPending;

  const handleQuantityChange = (productId: string, field: keyof LineDraft, value: string) => {
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  };

  const handleSubmit = async () => {
    if (!purchaseOrderId || !canSubmit) return;
    const items = rows
      .filter((r) => r.received > 0)
      .map((r) => ({
        productId: r.line.productId,
        receivedQuantity: r.received,
        rejectedQuantity: r.rejected,
        reason: r.draft.reason || undefined,
      }));

    try {
      await createReceipt.mutateAsync({ purchaseOrderId, idempotencyKey, items, notes: notes || undefined });
      setDrafts({});
      setNotes('');
      setIdempotencyKey(newIdempotencyKey());
      onSuccess?.();
    } catch {
      // Error is surfaced via the mutation's onError toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods {purchaseOrder ? `- ${purchaseOrder.orderNumber}` : ''}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-10">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-500 mb-4">Failed to load receiving details for this purchase order.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6 py-2">
            {!data.canReceive && (
              <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This purchase order cannot receive goods while its status is &quot;{data.purchaseOrder.status}&quot;.
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wide">Record a Delivery</h4>
              <div className="border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-secondary/50 text-left">
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold text-right">Ordered</th>
                      <th className="px-3 py-2 font-semibold text-right">Received So Far</th>
                      <th className="px-3 py-2 font-semibold text-right">Remaining</th>
                      <th className="px-3 py-2 font-semibold text-right w-28">Receiving Now</th>
                      <th className="px-3 py-2 font-semibold text-right w-24">Rejected</th>
                      <th className="px-3 py-2 font-semibold text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(({ line, draft, validQuantities, accepted, overDelivery }) => (
                      <tr key={line.productId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{line.productName}</div>
                          {line.pendingOverDeliveryQuantity > 0 && (
                            <div className="text-xs text-orange-500">
                              {line.pendingOverDeliveryQuantity} unit(s) awaiting over-delivery approval
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{line.orderedQuantity}</td>
                        <td className="px-3 py-2 text-right">{line.appliedQuantity}</td>
                        <td className="px-3 py-2 text-right font-semibold">{line.remainingQuantity}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            disabled={!data.canReceive}
                            value={draft?.receivedQuantity ?? ''}
                            onChange={(e) => handleQuantityChange(line.productId, 'receivedQuantity', e.target.value)}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            disabled={!data.canReceive}
                            value={draft?.rejectedQuantity ?? '0'}
                            onChange={(e) => handleQuantityChange(line.productId, 'rejectedQuantity', e.target.value)}
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {!validQuantities ? (
                            <span className="text-red-500">Invalid quantities</span>
                          ) : accepted === 0 && overDelivery === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="space-y-0.5">
                              {accepted > 0 && <div className="text-emerald-600 dark:text-emerald-400">+{accepted} to stock</div>}
                              {overDelivery > 0 && <div className="text-orange-500">{overDelivery} over-delivery (needs approval)</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasOverDeliveryPreview && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-4 py-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Some quantities exceed what remains on this order. The excess will be held as over-delivery and will not
                  affect stock until explicitly approved.
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Label htmlFor="gr-notes">Notes (optional)</Label>
                <textarea
                  id="gr-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g., Delivered by supplier van, one carton damaged in transit"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSubmit} disabled={!canSubmit}>
                  {createReceipt.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Record Receipt
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
                Receipt History
                {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </h4>
              {data.receipts.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <PackageCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No goods have been received against this order yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.receipts.map((receipt) => (
                    <div key={receipt.id} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{receipt.receiptNumber}</span>
                          {statusBadge(receipt.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(receipt.receivedAt).toLocaleString()} - {receipt.receivedBy}
                        </span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                        {receipt.items.map((item) => (
                          <li key={item.productId}>
                            {item.productName}: received {item.receivedQuantity}
                            {item.rejectedQuantity > 0 && `, rejected ${item.rejectedQuantity}`}
                            {item.acceptedQuantity > 0 && `, +${item.acceptedQuantity} to stock`}
                            {item.overDeliveryQuantity > 0 && `, ${item.overDeliveryQuantity} over-delivery`}
                          </li>
                        ))}
                      </ul>
                      {receipt.notes && <p className="text-xs italic text-muted-foreground mb-2">&quot;{receipt.notes}&quot;</p>}
                      {receipt.status === 'pending_approval' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700"
                            disabled={approveOverage.isPending || rejectOverage.isPending}
                            onClick={() =>
                              purchaseOrderId && approveOverage.mutate({ receiptId: receipt.id, purchaseOrderId })
                            }
                          >
                            {approveOverage.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            Approve Over-Delivery
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={approveOverage.isPending || rejectOverage.isPending}
                            onClick={() =>
                              purchaseOrderId && rejectOverage.mutate({ receiptId: receipt.id, purchaseOrderId })
                            }
                          >
                            {rejectOverage.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PackageX className="h-4 w-4 mr-1" />
                            )}
                            Reject Over-Delivery
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
