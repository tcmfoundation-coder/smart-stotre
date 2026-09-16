'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  Scan,
  Search,
  AlertCircle,
  Clock,
  Check,
  ShoppingCart,
  HelpCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';

// Import BarcodeScanner dynamically to prevent Next.js SSR document/window reference errors
const BarcodeScanner = dynamic(() => import('@/components/barcode-scanner'), {
  ssr: false,
});

interface ProductDetail {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  unit: string;
  categoryId?: { name: string } | string;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

export default function BarcodeScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ barcode: string; name: string; time: string }[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Load scan history from sessionStorage on mount
  useEffect(() => {
    const history = sessionStorage.getItem('smartmart-scan-history');
    if (history) {
      try {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setScanHistory(JSON.parse(history));
        }, 0);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveToHistory = (barcode: string, name: string) => {
    const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const newEntry = { barcode, name, time };
    const updatedHistory = [newEntry, ...scanHistory.slice(0, 4)];
    setScanHistory(updatedHistory);
    sessionStorage.setItem('smartmart-scan-history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setScanHistory([]);
    sessionStorage.removeItem('smartmart-scan-history');
  };

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setAddedToCart(false);

    try {
      const response = await fetch(`/api/pos/barcode/${barcode}`);
      const result = await response.json();

      if (result.success && result.data) {
        setProduct(result.data);
        saveToHistory(barcode, result.data.name);
        setScanning(false); // Stop camera on successful resolution
      } else {
        setError(`Product not found for barcode: "${barcode}"`);
        saveToHistory(barcode, 'Product Not Found');
        setScanning(false); // Stop camera on error
      }
    } catch (err) {
      console.error('Error looking up barcode:', err);
      setError('Connection failure: Unable to search the product database.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (barcode: string) => {
    if (barcode) {
      lookupBarcode(barcode);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      lookupBarcode(manualCode.trim());
      setManualCode('');
      setShowManualInput(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    try {
      const currentCartRaw = localStorage.getItem('smartmart-cart');
      let cart: CartItem[] = [];

      if (currentCartRaw) {
        cart = JSON.parse(currentCartRaw);
      }

      const existingItemIndex = cart.findIndex((item) => item.productId === product._id);

      if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
        cart[existingItemIndex].total = cart[existingItemIndex].quantity * cart[existingItemIndex].price;
      } else {
        cart.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.sellingPrice,
          quantity: 1,
          total: product.sellingPrice,
        });
      }

      localStorage.setItem('smartmart-cart', JSON.stringify(cart));
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Optical Scanner" userRole="cashier" />

      <main className="p-6 lg:p-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Scanner Pane (Left Column) */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="p-8 text-center">
                {scanning ? (
                  /* Live Camera Feed */
                  <div className="mb-6 overflow-hidden rounded-md border border-border">
                    <BarcodeScanner
                      onScanSuccess={handleScanSuccess}
                      onScanFailure={() => {
                        setError('Camera initialization failed. Please verify browser permissions.');
                        setScanning(false);
                      }}
                      onClose={() => setScanning(false)}
                      className="aspect-video"
                    />
                  </div>
                ) : (
                  /* Start Scanning Prompt Layout */
                  <div className="py-6">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Scan className="h-9 w-9" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Scanner Offline</h2>
                    <p className="mx-auto mb-6 mt-2 max-w-xs text-sm text-muted-foreground">
                      Initiate the device camera to read product optical barcodes.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-2"
                    variant={scanning ? 'outline' : 'default'}
                    onClick={() => {
                      setScanning(!scanning);
                      setError(null);
                      setProduct(null);
                    }}
                  >
                    {scanning ? 'Stop Scanning' : 'Open Camera'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowManualInput(!showManualInput);
                      setError(null);
                      setProduct(null);
                      setScanning(false);
                    }}
                  >
                    Manual Override
                  </Button>
                </div>

                {/* Manual Override Input */}
                {showManualInput && (
                  <form onSubmit={handleManualSearch} className="mt-6 flex items-center gap-3 border-t border-border pt-6">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Enter 13-digit barcode..."
                        className="pl-9"
                        required
                        autoFocus
                      />
                    </div>
                    <Button type="submit">Search</Button>
                  </form>
                )}
              </div>

              {/* Status Alert Panels */}
              {loading && (
                <div className="flex items-center justify-center gap-2 border-t border-border bg-info/5 px-8 py-5 text-sm text-info">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching inventory database...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-4 border-t border-border bg-destructive/5 px-8 py-5">
                  <div className="rounded-md bg-destructive/10 p-2.5 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-destructive">Search Failed</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Product Card Details */}
            {product && (
              <Card>
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="info">
                        {typeof product.categoryId === 'object' ? product.categoryId.name : 'Supermarket Product'}
                      </Badge>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{product.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="mt-1 text-xl font-semibold text-primary">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-5 md:grid-cols-4">
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">SKU Code</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-foreground">{product.sku}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Barcode</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">{product.barcode}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Stock Level</p>
                      <p className={cn('mt-1 text-xs font-semibold', product.stockQuantity <= product.minStockLevel ? 'text-warning' : 'text-foreground')}>
                        {product.stockQuantity} {product.unit || 'units'}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Margin (%)</p>
                      <p className="mt-1 text-xs font-semibold text-success">
                        {product.buyingPrice > 0
                          ? `+${Math.round(((product.sellingPrice - product.buyingPrice) / product.buyingPrice) * 100)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-border pt-5">
                    <Button
                      className={cn('flex-1 gap-2', addedToCart && 'bg-success text-success-foreground hover:bg-success')}
                      onClick={handleAddToCart}
                    >
                      {addedToCart ? (
                        <>
                          <Check className="h-4 w-4" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Add to POS Cart
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setProduct(null);
                        setScanning(true);
                      }}
                    >
                      Scan Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Session History Sidebar (Right Column) */}
          <div>
            <Card className="flex h-full min-h-[400px] flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session History</h3>
                  </div>
                  {scanHistory.length > 0 && (
                    <button onClick={clearHistory} className="text-xs font-medium text-destructive hover:underline">
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="max-h-[450px] flex-1 space-y-3 overflow-y-auto">
                  {scanHistory.length > 0 ? (
                    scanHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between rounded-md border p-3',
                          item.name === 'Product Not Found' ? 'border-destructive/20 bg-destructive/5' : 'border-border hover:bg-accent'
                        )}
                      >
                        <div className="flex-1 pr-2">
                          <p className={cn('truncate text-xs font-medium', item.name === 'Product Not Found' ? 'text-destructive' : 'text-foreground')}>
                            {item.name}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Code: {item.barcode}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.time}</span>
                          {item.name !== 'Product Not Found' && (
                            <button
                              onClick={() => lookupBarcode(item.barcode)}
                              className="rounded p-1 text-primary hover:bg-primary/10"
                              title="Re-open product details"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16">
                      <HelpCircle className="mb-3 h-9 w-9 text-muted-foreground/40" />
                      <p className="text-xs font-medium text-muted-foreground">No Recent Scans</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
