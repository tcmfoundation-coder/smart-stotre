import mongoose, { Schema, Document } from 'mongoose';

export interface IStockAdjustment extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  performedBy: string;
  performedById?: mongoose.Types.ObjectId;
  reviewedBy?: string;
  reviewedById?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ['increase', 'decrease'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    performedBy: {
      type: String,
      required: true,
    },
    performedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedBy: {
      type: String,
    },
    reviewedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
StockAdjustmentSchema.index({ productId: 1, createdAt: -1 });
StockAdjustmentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.StockAdjustment || mongoose.model<IStockAdjustment>('StockAdjustment', StockAdjustmentSchema);
