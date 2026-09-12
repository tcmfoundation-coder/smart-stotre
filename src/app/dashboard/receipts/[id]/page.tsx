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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Digital Receipt" userRole="cashier" />
      
      <main className="p-8">
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Receipt sale={sale} />
        </div>
      </main>
    </div>
  );
}
