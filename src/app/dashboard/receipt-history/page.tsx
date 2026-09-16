import { redirect } from 'next/navigation';

// dashboard/receipts is the canonical, real receipt-history implementation
// (server-rendered from getRecentSales/getSaleById, real print/PDF/share via
// the shared Receipt component). This route was a second, fully hardcoded
// implementation with a mock `receipts` array and non-functional
// print/download buttons - redirect instead of maintaining a fake duplicate.
export default function ReceiptHistoryRedirect() {
  redirect('/dashboard/receipts');
}
