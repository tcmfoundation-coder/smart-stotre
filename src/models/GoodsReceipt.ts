import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IGoodsReceiptItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku?: string;
  // Snapshot of the PO line's ordered quantity at the moment this receipt was
  // submitted - display-only, never used to recompute remaining quantity
  // (that is always derived live from PurchaseOrder.items + prior receipts,
  // see src/lib/goods-receipts.ts).
  orderedQuantity: number;
  // What the submitter recorded as physically arrived for this line, before
  // any rejection.
  receivedQuantity: number;
  // Portion of receivedQuantity rejected on arrival (damaged, wrong item).
  rejectedQuantity: number;
  // (receivedQuantity - rejectedQuantity) capped at the remaining ordered
  // quantity at submission time. Applied to Product.stockQuantity immediately
  // - never held hostage by an over-delivery decision on the same receipt.
  acceptedQuantity: number;
  // The portion of (receivedQuantity - rejectedQuantity) beyond what remained
  // on the order. Requires an explicit approve/reject decision before it can
  // ever affect stock.
  overDeliveryQuantity: number;
  reason?: string;
}

export interface IGoodsReceipt extends Document {
  receiptNumber: string;
  purchaseOrderId: mongoose.Types.ObjectId;
  orderNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  items: IGoodsReceiptItem[];
  // 'completed': no over-delivery on this receipt, or the over-delivery was
  //   already resolved as part of creation (never true today - see the
  //   goods-receipts route - kept as an enum value for a single-status model
  //   rather than a separate flag).
  // 'pending_approval': this receipt has an unresolved over-delivery; the
  //   accepted portion has already been applied to stock regardless.
  // 'rejected': the over-delivery portion was rejected; no effect on stock
  //   beyond the accepted portion applied at creation.
  status: 'completed' | 'pending_approval' | 'rejected';
  receivedBy: string;
  receivedById: mongoose.Types.ObjectId;
  receivedAt: Date;
  overageDecisionBy?: string;
  overageDecisionById?: mongoose.Types.ObjectId;
  overageDecisionAt?: Date;
  notes?: string;
  // Client-generated key that de-duplicates a retried/double-submitted
  // creation request - see the unique index below and the create route.
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoodsReceiptItemSchema = new Schema<IGoodsReceiptItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
  },
  orderedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  receivedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  rejectedQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  acceptedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  overDeliveryQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  reason: {
    type: String,
  },
});

const GoodsReceiptSchema = new Schema<IGoodsReceipt>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    items: {
      type: [GoodsReceiptItemSchema],
      required: true,
      validate: {
        validator: function (items: IGoodsReceiptItem[]) {
          return items.length > 0;
        },
        message: 'A goods receipt must have at least one item',
      },
    },
    status: {
      type: String,
      enum: ['completed', 'pending_approval', 'rejected'],
      required: true,
    },
    receivedBy: {
      type: String,
      required: true,
    },
    receivedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    overageDecisionBy: {
      type: String,
    },
    overageDecisionById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    overageDecisionAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

GoodsReceiptSchema.index({ purchaseOrderId: 1, createdAt: -1 });
GoodsReceiptSchema.index({ status: 1, createdAt: -1 });

const GoodsReceipt: Model<IGoodsReceipt> =
  mongoose.models.GoodsReceipt || mongoose.model<IGoodsReceipt>('GoodsReceipt', GoodsReceiptSchema);

export default GoodsReceipt;
