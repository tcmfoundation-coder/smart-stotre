import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICustomer extends Document {
  customerId: string;
  name?: string;
  email?: string;
  phone: string;
  address?: string;
  customerType: 'walk-in' | 'registered' | 'vip' | 'corporate';
  loyaltyPoints: number;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  favoriteProducts: mongoose.Types.ObjectId[];
  favoriteCategories: mongoose.Types.ObjectId[];
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
    },
    customerType: {
      type: String,
      enum: ['walk-in', 'registered', 'vip', 'corporate'],
      default: 'walk-in',
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty points cannot be negative'],
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: [0, 'Total spent cannot be negative'],
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: [0, 'Purchase count cannot be negative'],
    },
    lastPurchaseDate: {
      type: Date,
    },
    favoriteProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
    }],
    favoriteCategories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category',
    }],
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomerSchema.index({ name: 'text', phone: 'text', email: 'text' });

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
