import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IReturnItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitRefundPrice: number;
  refundAmount: number;
  reason: string;
  restocked: boolean;
}

export interface IReturn extends Document {
  returnNumber: string;
  saleId: mongoose.Types.ObjectId;
  saleNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  items: IReturnItem[];
  totalRefund: number;
  refundMethod: 'cash' | 'card' | 'transfer' | 'paystack';
  // process_returns is a single, unsplit RBAC permission (no separate
  // approve permission the way PurchaseOrder/StockAdjustment have) - a
  // return is processed and effective the moment it's created, not a
  // multi-step request/approval workflow.
  status: 'completed';
  processedBy: string;
  processedById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>({
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
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Return quantity must be at least 1'],
  },
  unitRefundPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    required: true,
  },
  restocked: {
    type: Boolean,
    default: true,
  },
});

const ReturnSchema = new Schema<IReturn>(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    saleNumber: {
      type: String,
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
    },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: {
        validator: (items: IReturnItem[]) => items.length > 0,
        message: 'A return must include at least one item',
      },
    },
    totalRefund: {
      type: Number,
      required: true,
      min: 0,
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'paystack'],
      required: true,
    },
    status: {
      type: String,
      enum: ['completed'],
      default: 'completed',
    },
    processedBy: {
      type: String,
      required: true,
    },
    processedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ReturnSchema.index({ saleId: 1, createdAt: -1 });
ReturnSchema.index({ createdAt: -1 });

const Return: Model<IReturn> = mongoose.models.Return || mongoose.model<IReturn>('Return', ReturnSchema);

export default Return;
