import Link from 'next/link';
import { Receipt as ReceiptIcon, Printer, Clock } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getRecentSales } from '@/lib/actions/pos';
import { formatCurrency, formatDate } from '@/lib/utils';
import { connection } from 'next/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

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

        {sales.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="No receipts yet"
            description="Receipts will appear here after sales are completed."
          />
        ) : (
          <div className="space-y-4">
            {sales.map((sale: any) => (
              <Card key={sale._id}>
                <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <ReceiptIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{sale.saleNumber}</p>
                      <h3 className="text-sm font-semibold text-foreground">{sale.customerName || 'Walk-in Customer'}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(sale.createdAt)}
                        </span>
                        <Badge variant="secondary">{sale.paymentMethod}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total paid</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(sale.total)}</p>
                    </div>
                    <Button asChild size="sm" className="gap-2">
                      <Link href={`/dashboard/receipts/${sale._id}`}>
                        <Printer className="h-4 w-4" />
                        Open Receipt
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
