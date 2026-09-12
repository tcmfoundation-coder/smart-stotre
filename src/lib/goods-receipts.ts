import mongoose from 'mongoose';
import { GoodsReceipt } from '@/models';
import type { IPurchaseOrder } from '@/models/PurchaseOrder';

// A Purchase Order's own item quantities are never mutated by receiving -
// "received" and "remaining" are always derived live by summing every prior
// GoodsReceipt for that PO. This is the same append-only-record pattern
// already used for Return (never mutates Sale) and Shift (computed live from
// Sale/Return queries) elsewhere in this codebase.

export type PurchaseOrderStatus = IPurchaseOrder['status'];

// A PO can only receive goods once it has been approved. 'pending' (not yet
// approved) and 'cancelled' are deliberately excluded - a cancelled PO's
// remaining quantity must never become receivable again, matching the user's
// requirement that cancellation is final unless business rules explicitly
// allow reopening it (which do not exist in this codebase today).
export const RECEIVABLE_PO_STATUSES: PurchaseOrderStatus[] = ['approved', 'partially_received'];

export interface POLineInput {
  productId: mongoose.Types.ObjectId | string;
  productName: string;
  quantity: number;
}

interface ReceiptItemLean {
  productId: mongoose.Types.ObjectId;
  acceptedQuantity: number;
  overDeliveryQuantity: number;
}

interface ReceiptLean {
  status: 'completed' | 'pending_approval' | 'rejected';
  items: ReceiptItemLean[];
}

export interface LineProgress {
  productId: string;
  productName: string;
  orderedQuantity: number;
  // Quantity actually reflected in Product.stockQuantity so far: every prior
  // receipt's acceptedQuantity, plus overDeliveryQuantity only from receipts
  // whose over-delivery has been approved (status 'completed').
  appliedQuantity: number;
  // What is still outstanding on this line. Rejected quantities are not
  // subtracted here - a rejected unit was never received, so it stays owed.
  remainingQuantity: number;
  // Over-delivery on this line awaiting an approve/reject decision (receipts
  // with status 'pending_approval'). Not part of appliedQuantity, and not
  // subtracted from remainingQuantity, since it has not affected stock yet.
  pendingOverDeliveryQuantity: number;
}

export async function getPriorReceipts(
  purchaseOrderId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession
): Promise<ReceiptLean[]> {
  return GoodsReceipt.find({ purchaseOrderId })
    .session(session ?? null)
    .select('status items.productId items.acceptedQuantity items.overDeliveryQuantity')
    .lean<ReceiptLean[]>();
}

export function computeLineProgress(poItems: POLineInput[], priorReceipts: ReceiptLean[]): LineProgress[] {
  const applied = new Map<string, number>();
  const pendingOverDelivery = new Map<string, number>();

  for (const receipt of priorReceipts) {
    for (const item of receipt.items) {
      const pid = item.productId.toString();
      applied.set(pid, (applied.get(pid) || 0) + item.acceptedQuantity);
      if (item.overDeliveryQuantity > 0) {
        if (receipt.status === 'completed') {
          applied.set(pid, (applied.get(pid) || 0) + item.overDeliveryQuantity);
        } else if (receipt.status === 'pending_approval') {
          pendingOverDelivery.set(pid, (pendingOverDelivery.get(pid) || 0) + item.overDeliveryQuantity);
        }
      }
    }
  }

  return poItems.map((line) => {
    const pid = line.productId.toString();
    const appliedQuantity = applied.get(pid) || 0;
    return {
      productId: pid,
      productName: line.productName,
      orderedQuantity: line.quantity,
      appliedQuantity,
      remainingQuantity: Math.max(0, line.quantity - appliedQuantity),
      pendingOverDeliveryQuantity: pendingOverDelivery.get(pid) || 0,
    };
  });
}

// A submitted quantity for a line is split into what can be applied to stock
// immediately (up to whatever remains on the order) and what exceeds it
// (over-delivery, which requires approval before it can ever touch stock).
export function splitAcceptedAndOverDelivery(netToStock: number, remaining: number) {
  const acceptedQuantity = Math.min(netToStock, remaining);
  const overDeliveryQuantity = Math.max(0, netToStock - remaining);
  return { acceptedQuantity, overDeliveryQuantity };
}

// Derives the PO's status from the actual quantities applied so far - never
// from the fact that someone clicked a button. A cancelled PO never
// auto-reopens.
export function deriveNextPurchaseOrderStatus(
  currentStatus: PurchaseOrderStatus,
  lines: LineProgress[]
): PurchaseOrderStatus {
  if (currentStatus === 'cancelled') return currentStatus;
  const fullyReceived = lines.every((l) => l.remainingQuantity === 0);
  if (fullyReceived) return 'delivered';
  const anyApplied = lines.some((l) => l.appliedQuantity > 0);
  if (anyApplied) return 'partially_received';
  return currentStatus;
}
