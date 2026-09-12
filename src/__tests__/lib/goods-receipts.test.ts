import {
  RECEIVABLE_PO_STATUSES,
  computeLineProgress,
  deriveNextPurchaseOrderStatus,
  splitAcceptedAndOverDelivery,
  type POLineInput,
} from '@/lib/goods-receipts';

function oid(id: string) {
  return { toString: () => id } as unknown as import('mongoose').Types.ObjectId;
}

const PRODUCT_A = 'product-a';
const PRODUCT_B = 'product-b';

describe('splitAcceptedAndOverDelivery', () => {
  it('accepts everything when it fits within what remains', () => {
    expect(splitAcceptedAndOverDelivery(40, 100)).toEqual({ acceptedQuantity: 40, overDeliveryQuantity: 0 });
  });

  it('caps accepted at remaining and treats the excess as over-delivery', () => {
    expect(splitAcceptedAndOverDelivery(110, 100)).toEqual({ acceptedQuantity: 100, overDeliveryQuantity: 10 });
  });

  it('treats a delivery against a fully-received line as entirely over-delivery', () => {
    expect(splitAcceptedAndOverDelivery(10, 0)).toEqual({ acceptedQuantity: 0, overDeliveryQuantity: 10 });
  });

  it('handles a zero net-to-stock (fully rejected delivery)', () => {
    expect(splitAcceptedAndOverDelivery(0, 50)).toEqual({ acceptedQuantity: 0, overDeliveryQuantity: 0 });
  });
});

describe('computeLineProgress', () => {
  const poItems: POLineInput[] = [
    { productId: oid(PRODUCT_A), productName: 'Widget', quantity: 100 },
    { productId: oid(PRODUCT_B), productName: 'Gadget', quantity: 50 },
  ];

  it('reports full remaining quantity with no prior receipts', () => {
    const lines = computeLineProgress(poItems, []);
    expect(lines).toEqual([
      { productId: PRODUCT_A, productName: 'Widget', orderedQuantity: 100, appliedQuantity: 0, remainingQuantity: 100, pendingOverDeliveryQuantity: 0 },
      { productId: PRODUCT_B, productName: 'Gadget', orderedQuantity: 50, appliedQuantity: 0, remainingQuantity: 50, pendingOverDeliveryQuantity: 0 },
    ]);
  });

  it('sums accepted quantities across multiple prior receipts (multi-partial receiving)', () => {
    const priorReceipts = [
      { status: 'completed' as const, items: [{ productId: oid(PRODUCT_A), acceptedQuantity: 40, overDeliveryQuantity: 0 }] },
      { status: 'completed' as const, items: [{ productId: oid(PRODUCT_A), acceptedQuantity: 30, overDeliveryQuantity: 0 }] },
    ];
    const lines = computeLineProgress(poItems, priorReceipts);
    const widget = lines.find((l) => l.productId === PRODUCT_A)!;
    expect(widget.appliedQuantity).toBe(70);
    expect(widget.remainingQuantity).toBe(30);
  });

  it('counts approved over-delivery (status completed) toward applied quantity', () => {
    const priorReceipts = [
      { status: 'completed' as const, items: [{ productId: oid(PRODUCT_A), acceptedQuantity: 100, overDeliveryQuantity: 10 }] },
    ];
    const lines = computeLineProgress(poItems, priorReceipts);
    const widget = lines.find((l) => l.productId === PRODUCT_A)!;
    expect(widget.appliedQuantity).toBe(110);
    expect(widget.remainingQuantity).toBe(0);
    expect(widget.pendingOverDeliveryQuantity).toBe(0);
  });

  it('does not count a still-pending over-delivery toward applied quantity', () => {
    const priorReceipts = [
      { status: 'pending_approval' as const, items: [{ productId: oid(PRODUCT_A), acceptedQuantity: 100, overDeliveryQuantity: 10 }] },
    ];
    const lines = computeLineProgress(poItems, priorReceipts);
    const widget = lines.find((l) => l.productId === PRODUCT_A)!;
    expect(widget.appliedQuantity).toBe(100);
    expect(widget.pendingOverDeliveryQuantity).toBe(10);
  });

  it('does not count a rejected over-delivery toward applied or pending quantity', () => {
    const priorReceipts = [
      { status: 'rejected' as const, items: [{ productId: oid(PRODUCT_A), acceptedQuantity: 100, overDeliveryQuantity: 10 }] },
    ];
    const lines = computeLineProgress(poItems, priorReceipts);
    const widget = lines.find((l) => l.productId === PRODUCT_A)!;
    expect(widget.appliedQuantity).toBe(100);
    expect(widget.pendingOverDeliveryQuantity).toBe(0);
  });
});

describe('deriveNextPurchaseOrderStatus', () => {
  const lineWithRemaining = (remaining: number, applied = 100 - remaining) => [
    { productId: PRODUCT_A, productName: 'Widget', orderedQuantity: 100, appliedQuantity: applied, remainingQuantity: remaining, pendingOverDeliveryQuantity: 0 },
  ];

  it('moves an approved PO to partially_received once some but not all quantity is applied', () => {
    expect(deriveNextPurchaseOrderStatus('approved', lineWithRemaining(30))).toBe('partially_received');
  });

  it('moves to delivered once every line is fully applied', () => {
    expect(deriveNextPurchaseOrderStatus('approved', lineWithRemaining(0))).toBe('delivered');
    expect(deriveNextPurchaseOrderStatus('partially_received', lineWithRemaining(0))).toBe('delivered');
  });

  it('leaves status unchanged when nothing has been applied yet', () => {
    expect(deriveNextPurchaseOrderStatus('approved', lineWithRemaining(100, 0))).toBe('approved');
  });

  it('never reopens a cancelled purchase order regardless of line quantities', () => {
    expect(deriveNextPurchaseOrderStatus('cancelled', lineWithRemaining(0))).toBe('cancelled');
  });
});

describe('RECEIVABLE_PO_STATUSES', () => {
  it('only allows receiving against approved or partially_received orders', () => {
    expect(RECEIVABLE_PO_STATUSES).toEqual(['approved', 'partially_received']);
    expect(RECEIVABLE_PO_STATUSES).not.toContain('pending');
    expect(RECEIVABLE_PO_STATUSES).not.toContain('cancelled');
    expect(RECEIVABLE_PO_STATUSES).not.toContain('delivered');
  });
});
