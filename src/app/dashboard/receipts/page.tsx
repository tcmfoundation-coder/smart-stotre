import Link from 'next/link';
import { Receipt as ReceiptIcon, Printer, Clock } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getRecentSales } from '@/lib/actions/pos';
import { formatCurrency, formatDate } from '@/lib/utils';
import { connection } from 'next/server';

export default async function ReceiptsPage() {
  await connection();
  const sales = await getRecentSales(100);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Receipts History" userRole="cashier" />

      <main className="p-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Reprint Center</p>
            <h2 className="text-2xl font-black text-foreground">All completed sales receipts</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Reopen any receipt and print it again whenever a cashier needs a copy.
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ReceiptIcon className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-foreground">No receipts yet</h3>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Receipts will appear here after sales are completed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale: any) => (
              <div
                key={sale._id}
                className="flex flex-col gap-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ReceiptIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                      {sale.saleNumber}
                    </p>
                    <h3 className="text-lg font-black text-foreground">
                      {sale.customerName || 'Walk-in Customer'}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(sale.createdAt)}
                      </span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
                        {sale.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground">Total paid</p>
                    <p className="text-xl font-black text-foreground">{formatCurrency(sale.total)}</p>
                  </div>
                  <Link
                    href={`/dashboard/receipts/${sale._id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    <Printer className="h-4 w-4" />
                    Open Receipt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
