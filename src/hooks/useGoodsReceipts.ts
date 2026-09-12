'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  sku?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  acceptedQuantity: number;
  overDeliveryQuantity: number;
  reason?: string;
}

export interface GoodsReceiptRecord {
  _id: string;
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: GoodsReceiptItem[];
  status: 'completed' | 'pending_approval' | 'rejected';
  receivedBy: string;
  receivedById: string;
  receivedAt: string;
  overageDecisionBy?: string;
  overageDecisionAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrderLineProgress {
  productId: string;
  productName: string;
  orderedQuantity: number;
  appliedQuantity: number;
  remainingQuantity: number;
  pendingOverDeliveryQuantity: number;
}

export interface GoodsReceiptsLookup {
  purchaseOrder: { _id: string; id: string; orderNumber: string; status: string; supplierName: string };
  canReceive: boolean;
  lines: PurchaseOrderLineProgress[];
  receipts: GoodsReceiptRecord[];
}

export function useGoodsReceiptsForOrder(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: ['goods-receipts', purchaseOrderId],
    queryFn: () => apiGet<GoodsReceiptsLookup>(`/api/purchase-orders/${purchaseOrderId}/goods-receipts`),
    select: (data) => data.data,
    enabled: !!purchaseOrderId,
  });
}

// apiPost/apiGet resolve to { success:false, error } on an HTTP-level failure
// rather than throwing - unwrap here so mutation onError actually fires
// (mirrors lookupSaleForReturn in useReturns.ts).
async function unwrap<T>(promise: Promise<{ success: boolean; data?: T; error?: string }>): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data;
}

export interface CreateGoodsReceiptItemInput {
  productId: string;
  receivedQuantity: number;
  rejectedQuantity?: number;
  reason?: string;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  idempotencyKey: string;
  items: CreateGoodsReceiptItemInput[];
  notes?: string;
}

export interface GoodsReceiptMutationResult {
  receipt: GoodsReceiptRecord;
  purchaseOrder: { _id: string; id: string; status: string } | null;
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseOrderId, ...body }: CreateGoodsReceiptInput) =>
      unwrap<GoodsReceiptMutationResult>(
        apiPost<GoodsReceiptMutationResult>(`/api/purchase-orders/${purchaseOrderId}/goods-receipts`, body)
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', variables.purchaseOrderId] });
      toast.success('Goods receipt recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record goods receipt');
    },
  });
}

export function useApproveOverDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId }: { receiptId: string; purchaseOrderId: string }) =>
      unwrap<GoodsReceiptMutationResult>(apiPost<GoodsReceiptMutationResult>(`/api/goods-receipts/${receiptId}/approve-overage`, {})),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', variables.purchaseOrderId] });
      toast.success('Over-delivery approved and added to stock');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve over-delivery');
    },
  });
}

export function useRejectOverDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId }: { receiptId: string; purchaseOrderId: string }) =>
      unwrap<GoodsReceiptRecord>(apiPost<GoodsReceiptRecord>(`/api/goods-receipts/${receiptId}/reject-overage`, {})),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', variables.purchaseOrderId] });
      toast.success('Over-delivery rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject over-delivery');
    },
  });
}
