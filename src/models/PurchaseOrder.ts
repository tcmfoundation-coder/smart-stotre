import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  items: IPurchaseOrderItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'partially_received' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  createdBy: string;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
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
      type: [PurchaseOrderItemSchema],
      required: true,
      validate: {
        validator: function(items: IPurchaseOrderItem[]) {
          return items.length > 0;
        },
        message: 'Purchase order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'partially_received', 'delivered', 'cancelled'],
      default: 'pending',
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PurchaseOrderSchema.index({ supplierId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ orderNumber: 1 });

// Virtual for item count
PurchaseOrderSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

// Ensure virtuals are included in JSON
PurchaseOrderSchema.set('toJSON', { virtuals: true });
PurchaseOrderSchema.set('toObject', { virtuals: true });

export default mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
