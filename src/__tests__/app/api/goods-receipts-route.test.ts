import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { POST as createReceipt, GET as lookupReceipts } from '@/app/api/purchase-orders/[id]/goods-receipts/route';
import { POST as approveOverage } from '@/app/api/goods-receipts/[id]/approve-overage/route';
import { POST as rejectOverage } from '@/app/api/goods-receipts/[id]/reject-overage/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { GoodsReceipt, Product, PurchaseOrder } from '@/models';
import { logActivity } from '@/lib/activity-log';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('@/lib/activity-log', () => ({
  logActivity: jest.fn(),
}));

jest.mock('@/models', () => ({
  GoodsReceipt: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
  },
  Product: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  PurchaseOrder: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, startSession: jest.fn() };
});

// A minimal stand-in for a mongoose Query: chainable on session/select/sort/
// lean (each just returns itself) and directly thenable, so `await` resolves
// to `result` no matter how many (or few) chain methods were called first -
// matching every real call shape used across the goods-receipt routes.
interface ChainableQuery<T> {
  session: jest.Mock;
  select: jest.Mock;
  sort: jest.Mock;
  lean: jest.Mock;
  then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
}

function chainable<T>(result: T): ChainableQuery<T> {
  const query = {
    session: jest.fn(),
    select: jest.fn(),
    sort: jest.fn(),
    lean: jest.fn(),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  } as ChainableQuery<T>;
  query.session.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
}

function oid(id: string) {
  return { toString: () => id } as unknown as import('mongoose').Types.ObjectId;
}

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function mockTransactionalSession() {
  (mongoose.startSession as jest.Mock).mockResolvedValue({
    withTransaction: (fn: () => Promise<unknown>) => fn(),
    endSession: jest.fn().mockResolvedValue(undefined),
  });
}

const PO_ID = '507f1f77bcf86cd799439001';
const PRODUCT_ID = '507f1f77bcf86cd799439011';
const PRODUCT_ID_2 = '507f1f77bcf86cd799439012';
const SUPPLIER_ID = '507f1f77bcf86cd799439021';
const RECEIPT_ID = '507f1f77bcf86cd799439031';

function makePO(overrides: Record<string, unknown> = {}) {
  return {
    _id: oid(PO_ID),
    orderNumber: 'PO-1001',
    supplierId: oid(SUPPLIER_ID),
    supplierName: 'Acme Supplies',
    status: 'approved',
    items: [{ productId: oid(PRODUCT_ID), productName: 'Widget', quantity: 100 }],
    ...overrides,
  };
}

function createRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/purchase-orders/${PO_ID}/goods-receipts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function poContext(id = PO_ID) {
  return { params: Promise.resolve({ id }) };
}

function receiptContext(id = RECEIPT_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/purchase-orders/[id]/goods-receipts (create)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionalSession();
  });

  it('rejects a user without manage_inventory (unauthorized receipt creation)', async () => {
    mockSession('cashier');
    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-1', items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );
    expect(response.status).toBe(403);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('records a full receipt, applies it to stock once, and marks the PO delivered', async () => {
    mockSession('manager');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));
    const createdDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-1',
      status: 'completed',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 100, overDeliveryQuantity: 0, rejectedQuantity: 0, receivedQuantity: 100 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.create as jest.Mock).mockResolvedValue([createdDoc]);
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: oid(PRODUCT_ID) });
    (PurchaseOrder.findByIdAndUpdate as jest.Mock).mockReturnValue(chainable({ ...makePO(), status: 'delivered' }));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-full', items: [{ productId: PRODUCT_ID, receivedQuantity: 100 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.receipt.status).toBe('completed');
    expect(Product.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      PRODUCT_ID,
      { $inc: { stockQuantity: 100 } },
      expect.objectContaining({ session: expect.anything() })
    );
    expect(PurchaseOrder.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'delivered' }),
      expect.objectContaining({ session: expect.anything(), new: true })
    );
    expect(payload.data.purchaseOrder.status).toBe('delivered');
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOODS_RECEIPT_CREATED' }));
  });

  it('records a partial receipt and marks the PO partially_received', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));
    const createdDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-2',
      status: 'completed',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 40, overDeliveryQuantity: 0, rejectedQuantity: 0, receivedQuantity: 40 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.create as jest.Mock).mockResolvedValue([createdDoc]);
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: oid(PRODUCT_ID) });
    (PurchaseOrder.findByIdAndUpdate as jest.Mock).mockReturnValue(chainable({ ...makePO(), status: 'partially_received' }));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-partial', items: [{ productId: PRODUCT_ID, receivedQuantity: 40 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(PRODUCT_ID, { $inc: { stockQuantity: 40 } }, expect.anything());
    expect(payload.data.purchaseOrder.status).toBe('partially_received');
  });

  it('sums multiple prior partial receipts to determine remaining, and completes the order on the final one', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'partially_received' })));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    // Two prior completed receipts already applied 40 + 30 = 70 of the 100 ordered.
    (GoodsReceipt.find as jest.Mock).mockReturnValue(
      chainable([
        { status: 'completed', items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 40, overDeliveryQuantity: 0 }] },
        { status: 'completed', items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 30, overDeliveryQuantity: 0 }] },
      ])
    );
    const createdDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-3',
      status: 'completed',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 30, overDeliveryQuantity: 0, rejectedQuantity: 0, receivedQuantity: 30 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.create as jest.Mock).mockResolvedValue([createdDoc]);
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: oid(PRODUCT_ID) });
    (PurchaseOrder.findByIdAndUpdate as jest.Mock).mockReturnValue(chainable({ ...makePO(), status: 'delivered' }));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-final', items: [{ productId: PRODUCT_ID, receivedQuantity: 30 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    // Remaining before this receipt was 100 - 70 = 30, exactly matching what's submitted.
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(PRODUCT_ID, { $inc: { stockQuantity: 30 } }, expect.anything());
    expect(payload.data.purchaseOrder.status).toBe('delivered');
  });

  it('splits a delivery exceeding what remains into accepted + over-delivery, applying only the accepted portion (unauthorized over-delivery is never applied to stock)', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));
    const createdDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-4',
      status: 'pending_approval',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 100, overDeliveryQuantity: 10, rejectedQuantity: 0, receivedQuantity: 110 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.create as jest.Mock).mockResolvedValue([createdDoc]);
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: oid(PRODUCT_ID) });
    (PurchaseOrder.findByIdAndUpdate as jest.Mock).mockReturnValue(chainable({ ...makePO(), status: 'delivered' }));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-over', items: [{ productId: PRODUCT_ID, receivedQuantity: 110 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.receipt.status).toBe('pending_approval');
    // Only the 100 accepted units are applied - the 10-unit excess is held, not silently added.
    expect(Product.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(PRODUCT_ID, { $inc: { stockQuantity: 100 } }, expect.anything());
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOODS_RECEIPT_CREATED', severity: 'warning' }));
  });

  it('returns the existing receipt on a duplicate submission instead of creating a second one (idempotent retry)', async () => {
    mockSession('admin');
    const existing = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-5',
      status: 'completed',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 40, overDeliveryQuantity: 0, rejectedQuantity: 0, receivedQuantity: 40 }],
    };
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(existing));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'partially_received' })));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'already-used-key', items: [{ productId: PRODUCT_ID, receivedQuantity: 40 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.receipt.receiptNumber).toBe('GR-5');
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('never double-applies inventory when two concurrent requests race on the same idempotency key', async () => {
    mockSession('admin');
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));

    const winner = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-6',
      status: 'completed',
      items: [{ productId: PRODUCT_ID, acceptedQuantity: 40, overDeliveryQuantity: 0, rejectedQuantity: 0, receivedQuantity: 40 }],
    };
    // First check (pre-insert) finds nothing; the insert itself then loses the
    // race and reports a duplicate key, so the second lookup finds the winner.
    (GoodsReceipt.findOne as jest.Mock)
      .mockReturnValueOnce(chainable(null))
      .mockReturnValueOnce(chainable(winner));
    (GoodsReceipt.create as jest.Mock).mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'racing-key', items: [{ productId: PRODUCT_ID, receivedQuantity: 40 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.receipt.receiptNumber).toBe('GR-6');
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects receiving against a cancelled purchase order', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'cancelled' })));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-cancelled', items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/cancelled/);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('rejects receiving against a still-pending (not yet approved) purchase order', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'pending' })));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-pending', items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );

    expect(response.status).toBe(400);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('rejects a missing purchase order', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(null));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-no-po', items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );

    expect(response.status).toBe(404);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('rejects a product that is no longer in the catalog', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    // The product lookup comes back empty - the product referenced by the PO no longer exists.
    (Product.find as jest.Mock).mockReturnValue(chainable([]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-no-product', items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toMatch(/no longer exists/);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('rejects a product that is not part of the purchase order', async () => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID_2), sku: 'OTHER' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-wrong-product', items: [{ productId: PRODUCT_ID_2, receivedQuantity: 10 }] }),
      poContext()
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/not part of this purchase order/);
  });

  it.each([
    { receivedQuantity: -5 },
    { receivedQuantity: 10, rejectedQuantity: 20 },
    { receivedQuantity: 1.5 },
  ])('rejects invalid quantities: %j', async (itemOverrides: { receivedQuantity: number; rejectedQuantity?: number }) => {
    mockSession('admin');
    (GoodsReceipt.findOne as jest.Mock).mockReturnValue(chainable(null));
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (Product.find as jest.Mock).mockReturnValue(chainable([{ _id: oid(PRODUCT_ID), sku: 'WID-1' }]));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));

    const response = await createReceipt(
      createRequest({ idempotencyKey: 'key-invalid', items: [{ productId: PRODUCT_ID, ...itemOverrides }] }),
      poContext()
    );

    expect(response.status).toBe(400);
    expect(GoodsReceipt.create).not.toHaveBeenCalled();
  });

  it('rejects a request with no idempotencyKey', async () => {
    mockSession('admin');
    const response = await createReceipt(
      createRequest({ items: [{ productId: PRODUCT_ID, receivedQuantity: 10 }] }),
      poContext()
    );
    expect(response.status).toBe(400);
  });
});

describe('GET /api/purchase-orders/[id]/goods-receipts (lookup)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes remaining quantity live and reports whether the order can currently receive goods', async () => {
    mockSession('manager');
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO()));
    (GoodsReceipt.find as jest.Mock)
      .mockReturnValueOnce(chainable([{ status: 'completed', items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 40, overDeliveryQuantity: 0 }] }]))
      .mockReturnValueOnce(chainable([{ _id: oid(RECEIPT_ID), purchaseOrderId: oid(PO_ID), supplierId: oid(SUPPLIER_ID), receivedById: oid('user-1'), receiptNumber: 'GR-1', status: 'completed', items: [] }]));

    const response = await lookupReceipts(new NextRequest(`http://localhost/api/purchase-orders/${PO_ID}/goods-receipts`), poContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.canReceive).toBe(true);
    expect(payload.data.lines[0].remainingQuantity).toBe(60);
    expect(payload.data.receipts).toHaveLength(1);
  });

  it('reports canReceive=false for a cancelled purchase order', async () => {
    mockSession('manager');
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'cancelled' })));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(chainable([]));

    const response = await lookupReceipts(new NextRequest(`http://localhost/api/purchase-orders/${PO_ID}/goods-receipts`), poContext());
    const payload = await response.json();

    expect(payload.data.canReceive).toBe(false);
  });
});

describe('POST /api/goods-receipts/[id]/approve-overage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionalSession();
  });

  it('rejects a user without approve_purchase_orders (unauthorized approval)', async () => {
    mockSession('cashier');
    const response = await approveOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    expect(response.status).toBe(403);
    expect(GoodsReceipt.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('approves the over-delivered quantity, adds it to stock exactly once, and logs the decision (authorized over-delivery)', async () => {
    mockSession('admin');
    const approvedDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-4',
      status: 'completed',
      items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 100, overDeliveryQuantity: 10, rejectedQuantity: 0, receivedQuantity: 110 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.findOneAndUpdate as jest.Mock).mockResolvedValue(approvedDoc);
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: oid(PRODUCT_ID) });
    (PurchaseOrder.findById as jest.Mock).mockReturnValue(chainable(makePO({ status: 'delivered' })));
    (GoodsReceipt.find as jest.Mock).mockReturnValue(
      chainable([{ status: 'completed', items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 100, overDeliveryQuantity: 10 }] }])
    );

    const response = await approveOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(GoodsReceipt.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: RECEIPT_ID, status: 'pending_approval' },
      expect.objectContaining({ status: 'completed' }),
      expect.objectContaining({ session: expect.anything(), new: true })
    );
    expect(Product.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [productIdArg, updateArg, optionsArg] = (Product.findByIdAndUpdate as jest.Mock).mock.calls[0];
    expect(productIdArg.toString()).toBe(PRODUCT_ID);
    expect(updateArg).toEqual({ $inc: { stockQuantity: 10 } });
    expect(optionsArg).toEqual(expect.objectContaining({ session: expect.anything() }));
    // Remaining was already 0 for this line before approval (over-delivery only
    // ever exists once nothing remains) - so approving it can never change the
    // PO's own status; it only affects stock.
    expect(PurchaseOrder.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOODS_RECEIPT_OVERAGE_APPROVED' }));
    expect(payload.data.receipt.status).toBe('completed');
  });

  it('rejects a second concurrent approval attempt once the receipt is no longer pending (duplicate inventory application)', async () => {
    mockSession('admin');
    // The compare-and-swap no longer matches - another request already resolved it.
    (GoodsReceipt.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (GoodsReceipt.findById as jest.Mock).mockReturnValue(chainable({ status: 'completed' }));

    const response = await approveOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/completed/);
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing goods receipt', async () => {
    mockSession('admin');
    (GoodsReceipt.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (GoodsReceipt.findById as jest.Mock).mockReturnValue(chainable(null));

    const response = await approveOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    expect(response.status).toBe(404);
  });
});

describe('POST /api/goods-receipts/[id]/reject-overage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a user without approve_purchase_orders', async () => {
    mockSession('cashier');
    const response = await rejectOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    expect(response.status).toBe(403);
  });

  it('rejects the over-delivered quantity without touching stock', async () => {
    mockSession('manager');
    const rejectedDoc = {
      _id: oid(RECEIPT_ID),
      purchaseOrderId: oid(PO_ID),
      supplierId: oid(SUPPLIER_ID),
      receivedById: oid('user-1'),
      receiptNumber: 'GR-4',
      status: 'rejected',
      items: [{ productId: oid(PRODUCT_ID), acceptedQuantity: 100, overDeliveryQuantity: 10, rejectedQuantity: 0, receivedQuantity: 110 }],
      toObject: function () { return this; },
    };
    (GoodsReceipt.findOneAndUpdate as jest.Mock).mockResolvedValue(rejectedDoc);

    const response = await rejectOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('rejected');
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'GOODS_RECEIPT_OVERAGE_REJECTED' }));
  });

  it('rejects re-processing an already-decided receipt', async () => {
    mockSession('manager');
    (GoodsReceipt.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (GoodsReceipt.findById as jest.Mock).mockResolvedValue({ status: 'rejected' });

    const response = await rejectOverage(new NextRequest('http://localhost/x', { method: 'POST' }), receiptContext());
    expect(response.status).toBe(400);
  });
});
