'use client';

import { Printer, Download, Share2, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ReceiptProps {
  sale: any;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function Receipt({ sale, storeName = 'SmartMart Pro', storeAddress = 'Terminal 01, Lagos HQ', storePhone = '+234 800 SMART MART' }: ReceiptProps) {
  const handlePrint = () => window.print();

  const handleShare = async () => {
    const shareText = `Receipt ${sale.saleNumber} — ${formatCurrency(sale.total)} — ${storeName}`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Receipt', text: shareText, url: shareUrl });
      } catch {
        // user cancelled the native share sheet - nothing to do
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Receipt link copied to clipboard');
    } else {
      toast.error('Sharing is not supported in this browser');
    }
  };

  return (
    <div className="space-y-6">
      {/* Print sizing: an 80mm-wide thermal page with content-driven height,
          so the receipt never gets forced onto US Letter/A4 and paginated. */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      {/* ---------- Screen view (hidden on print) ---------- */}
      <div className="print:hidden space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Transaction Complete</h2>
            <p className="text-sm text-muted-foreground">Your purchase has been recorded successfully.</p>
          </div>
        </div>

        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-base font-semibold text-foreground">{storeName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{storeAddress} · {storePhone}</p>
          </div>

          {/* Sale details */}
          <div className="mb-8 grid grid-cols-2 gap-6 border-y border-dashed border-border py-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Receipt Number</p>
                <p className="text-sm font-medium text-foreground">{sale.saleNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{formatDate(sale.createdAt)} · {formatTime(sale.createdAt)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Cashier</p>
                <p className="text-sm font-medium text-foreground">{sale.cashierId?.name || 'System'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium text-foreground">{sale.customerName || 'Walk-in Customer'}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</h3>
            <div className="space-y-3">
              {sale.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.quantity} units @ {formatCurrency(item.sellingPrice)}</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 rounded-md bg-muted/40 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-destructive">-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium text-foreground">{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <span className="text-sm capitalize text-muted-foreground">{sale.paymentMethod} Payment</span>
              </div>
              <span className="text-2xl font-semibold text-primary">{formatCurrency(sale.total)}</span>
            </div>

            {sale.paymentMethod === 'cash' && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Received</span>
                  <span className="font-medium text-foreground">{formatCurrency(sale.cashReceived)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-medium text-success">{formatCurrency(sale.change)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-foreground">Thank you for shopping with {storeName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Please keep this receipt for returns and exchanges.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-3">
          <Button onClick={handlePrint} className="min-w-[140px] flex-1 gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            title='Choose "Save as PDF" in the print dialog'
            className="min-w-[140px] flex-1 gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleShare} className="min-w-[140px] flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* ---------- Print view (hidden on screen, 80mm thermal layout) ---------- */}
      <div className="hidden print:block print:w-[80mm] print:px-3 print:py-4 print:font-mono print:text-black print:bg-white">
        <div className="text-center">
          <p className="font-bold text-sm uppercase">{storeName}</p>
          <p className="text-[10px]">{storeAddress}</p>
          <p className="text-[10px]">{storePhone}</p>
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="text-[10px] leading-relaxed">
          <div className="flex justify-between"><span>Receipt#</span><span>{sale.saleNumber}</span></div>
          <div className="flex justify-between"><span>Date</span><span>{formatDate(sale.createdAt)} {formatTime(sale.createdAt)}</span></div>
          <div className="flex justify-between"><span>Cashier</span><span>{sale.cashierId?.name || 'SYSTEM'}</span></div>
          <div className="flex justify-between"><span>Customer</span><span>{sale.customerName || 'WALK-IN'}</span></div>
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-1.5">
          {sale.items.map((item: any, index: number) => (
            <div key={index} className="text-[10px]" style={{ breakInside: 'avoid' }}>
              <div className="font-bold">{item.productName}</div>
              <div className="flex justify-between">
                <span>{item.quantity} x {formatCurrency(item.sellingPrice)}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="text-[10px] space-y-0.5" style={{ breakInside: 'avoid' }}>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
          {sale.discount > 0 && (
            <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(sale.discount)}</span></div>
          )}
          {sale.tax > 0 && (
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(sale.tax)}</span></div>
          )}
          <div className="flex justify-between font-bold text-xs mt-1 pt-1 border-t border-black">
            <span>TOTAL</span><span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between capitalize mt-1"><span>Payment</span><span>{sale.paymentMethod}</span></div>
          {sale.paymentMethod === 'cash' && (
            <>
              <div className="flex justify-between"><span>Received</span><span>{formatCurrency(sale.cashReceived)}</span></div>
              <div className="flex justify-between"><span>Change</span><span>{formatCurrency(sale.change)}</span></div>
            </>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="text-center text-[10px]">
          <p>Thank you for shopping with {storeName}</p>
          <p>Please keep this receipt for returns and exchanges.</p>
        </div>
      </div>
    </div>
  );
}
