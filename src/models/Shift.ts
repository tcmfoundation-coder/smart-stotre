import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IShiftPaymentTotals {
  cash: number;
  card: number;
  transfer: number;
  paystack: number;
}

export interface IShift extends Document {
  openedAt: Date;
  closedAt?: Date;
  openedBy: mongoose.Types.ObjectId;
  openedByName: string;
  closedBy?: mongoose.Types.ObjectId;
  closedByName?: string;
  branchId?: mongoose.Types.ObjectId;
  openingCashBalance: number;
  closingCashBalance?: number;
  expectedCash?: number;
  actualCash?: number;
  cashVariance?: number;
  salesCount: number;
  salesTotal: number;
  refundsCount: number;
  refundsTotal: number;
  paymentMethodTotals: IShiftPaymentTotals;
  status: 'open' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const ShiftPaymentTotalsSchema = new Schema<IShiftPaymentTotals>(
  {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
    paystack: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShiftSchema = new Schema<IShift>(
  {
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openedByName: {
      type: String,
      required: true,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    closedByName: {
      type: String,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    openingCashBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    // closingCashBalance mirrors actualCash - the amount physically counted
    // in the drawer when the shift is closed. Kept as a separate named field
    // since both were specified explicitly, but they are always set together.
    closingCashBalance: {
      type: Number,
      min: 0,
    },
    expectedCash: {
      type: Number,
    },
    actualCash: {
      type: Number,
      min: 0,
    },
    cashVariance: {
      type: Number,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    salesTotal: {
      type: Number,
      default: 0,
    },
    refundsCount: {
      type: Number,
      default: 0,
    },
    refundsTotal: {
      type: Number,
      default: 0,
    },
    paymentMethodTotals: {
      type: ShiftPaymentTotalsSchema,
      default: () => ({ cash: 0, card: 0, transfer: 0, paystack: 0 }),
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

ShiftSchema.index({ openedBy: 1, status: 1 });
ShiftSchema.index({ openedAt: -1 });

const Shift: Model<IShift> = mongoose.models.Shift || mongoose.model<IShift>('Shift', ShiftSchema);

export default Shift;
