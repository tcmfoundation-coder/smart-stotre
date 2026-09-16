import { DashboardHeader } from '@/components/dashboard-header';
import { getRecentSales } from '@/lib/actions/pos';
import { connection } from 'next/server';
import { ReceiptsList } from './receipts-list';

export default async function ReceiptsPage() {
  await connection();
  const sales = await getRecentSales(100);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Receipts History" userRole="cashier" />

      <main className="p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">All completed sales receipts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reopen any receipt and print it again whenever a cashier needs a copy.
          </p>
        </div>

        <ReceiptsList sales={sales} />
      </main>
    </div>
  );
}
