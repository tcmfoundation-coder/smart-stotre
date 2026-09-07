import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IPromotion extends Document {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'buy-one-get-one';
  value: number;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'paused' | 'scheduled';
  categoryIds: Types.ObjectId[];
  productIds: Types.ObjectId[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: {
      type: String,
      required: [true, 'Promotion name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'buy-one-get-one'],
      required: [true, 'Promotion type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Promotion value is required'],
      min: 0,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'scheduled'],
      default: 'active',
    },
    categoryIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Category',
    }],
    productIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
    }],
    minPurchase: {
      type: Number,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

PromotionSchema.index({ status: 1, startDate: 1, endDate: 1 });

const Promotion: Model<IPromotion> = mongoose.models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema);

export default Promotion;
