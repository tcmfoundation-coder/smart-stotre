import { DashboardHeader } from '@/components/dashboard-header';
import { Receipt } from '@/components/receipt';
import { getSaleById } from '@/lib/actions/pos';
import { connection } from 'next/server';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const sale = await getSaleById(id);

  if (!sale) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Sale not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen print:min-h-0 bg-background transition-colors duration-300">
      <div className="print:hidden">
        <DashboardHeader title="Digital Receipt" userRole="cashier" />
      </div>

      <main className="p-8 print:p-0">
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 print:max-w-none print:mx-0 print:animate-none">
          <Receipt sale={sale} />
        </div>
      </main>
    </div>
  );
}
