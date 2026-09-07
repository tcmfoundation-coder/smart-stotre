import { Sale, Return } from '@/models';
import type { IShiftPaymentTotals } from '@/models/Shift';

export interface LiveShiftStats {
  salesCount: number;
  salesTotal: number;
  refundsCount: number;
  refundsTotal: number;
  paymentMethodTotals: IShiftPaymentTotals;
}

// Computed live from the source Sale/Return records rather than incremented
// at write time, so shift totals can never drift out of sync with the real
// data - the shift is a read-only lens over cashierId + a time window, not a
// separate ledger someone has to remember to keep updated.
export async function computeLiveShiftStats(
  cashierId: string,
  openedAt: Date,
  closedAt?: Date
): Promise<LiveShiftStats> {
  const dateFilter: Record<string, Date> = { $gte: openedAt };
  if (closedAt) {
    dateFilter.$lte = closedAt;
  }

  const [sales, refunds] = await Promise.all([
    Sale.find({ status: 'completed', cashierId, createdAt: dateFilter }).lean(),
    Return.find({ processedById: cashierId, createdAt: dateFilter }).lean(),
  ]);

  const paymentMethodTotals: IShiftPaymentTotals = { cash: 0, card: 0, transfer: 0, paystack: 0 };
  let salesTotal = 0;
  for (const sale of sales) {
    salesTotal += sale.total;
    if (sale.paymentMethod in paymentMethodTotals) {
      paymentMethodTotals[sale.paymentMethod as keyof IShiftPaymentTotals] += sale.total;
    }
  }

  let refundsTotal = 0;
  for (const ret of refunds) {
    refundsTotal += ret.totalRefund;
    if (ret.refundMethod in paymentMethodTotals) {
      paymentMethodTotals[ret.refundMethod as keyof IShiftPaymentTotals] -= ret.totalRefund;
    }
  }

  return {
    salesCount: sales.length,
    salesTotal,
    refundsCount: refunds.length,
    refundsTotal,
    paymentMethodTotals,
  };
}
