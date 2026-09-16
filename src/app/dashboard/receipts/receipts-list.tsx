'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt as ReceiptIcon, Printer, Clock, Search, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

interface Sale {
  _id: string;
  saleNumber: string;
  customerName?: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  cashierId?: { name?: string };
}

export function ReceiptsList({ sales }: { sales: Sale[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const query = searchQuery.trim().toLowerCase();
  const filteredSales = query
    ? sales.filter((sale) =>
        sale.saleNumber?.toLowerCase().includes(query) ||
        sale.customerName?.toLowerCase().includes(query) ||
        sale.cashierId?.name?.toLowerCase().includes(query) ||
        sale.paymentMethod?.toLowerCase().includes(query)
      )
    : sales;

  if (sales.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="No receipts yet"
        description="Receipts will appear here after sales are completed."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by sale number, customer, cashier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredSales.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title="No receipts found" description="Try a different search term." />
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
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
                      {sale.cashierId?.name && <span className="text-xs">Cashier: {sale.cashierId.name}</span>}
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
    </div>
  );
}
