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
  Eye
} from 'lucide-react';
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

      const existingItemIndex = cart.findIndex(item => item.productId === product._id);

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
          total: product.sellingPrice
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Optical Scanner" userRole="cashier" />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Scanner Pane (Left Column) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_20px_50px_rgba(8,112,184,0.08)] border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-10 text-center">
                {scanning ? (
                  /* Live Camera Feed */
                  <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <BarcodeScanner
                      onScanSuccess={handleScanSuccess}
                      onScanFailure={(err) => {
                        setError('Camera initialization failed. Please verify browser permissions.');
                        setScanning(false);
                      }}
                      onClose={() => setScanning(false)}
                      className="aspect-video"
                    />
                  </div>
                ) : (
                  /* Start Scanning Prompt Layout */
                  <div className="py-8">
                    <div className="w-28 h-28 bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700 shadow-inner">
                      <Scan className="h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Scanner Offline
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold mt-2 mb-8 max-w-xs mx-auto">
                      Initiate the device camera to read product optical barcodes.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setScanning(!scanning);
                      setError(null);
                      setProduct(null);
                    }}
                    className={cn(
                      "flex-1 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95",
                      scanning 
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100/50 shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                    )}
                  >
                    {scanning ? 'Stop Scanning' : 'Open Camera'}
                  </button>

                  <button
                    onClick={() => {
                      setShowManualInput(!showManualInput);
                      setError(null);
                      setProduct(null);
                      setScanning(false);
                    }}
                    className="px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-colors active:scale-95"
                  >
                    Manual Override
                  </button>
                </div>

                {/* Manual Override Input */}
                {showManualInput && (
                  <form onSubmit={handleManualSearch} className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-3 animate-in slide-in-from-top-3 duration-300">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Enter 13-digit barcode..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-600/15 text-sm font-semibold outline-none text-slate-900 dark:text-white"
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                      Search
                    </button>
                  </form>
                )}
              </div>

              {/* Status Alert Panels */}
              {loading && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 px-8 py-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Searching inventory database...</p>
                </div>
              )}

              {error && (
                <div className="bg-rose-50/50 dark:bg-rose-950/20 px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-500">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Search Failed</h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Card Details */}
            {product && (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
                      {typeof product.categoryId === 'object' ? product.categoryId.name : 'Supermarket Product'}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                      {product.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selling Price</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU Code</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">{product.sku}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barcode</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-1 tracking-tight">{product.barcode}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Level</p>
                    <p className={cn(
                      "text-xs font-black mt-1",
                      product.stockQuantity <= product.minStockLevel ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                    )}>
                      {product.stockQuantity} {product.unit || 'units'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin (%)</p>
                    <p className="text-xs font-black text-emerald-500 mt-1">
                      {product.buyingPrice > 0
                        ? `+${Math.round(((product.sellingPrice - product.buyingPrice) / product.buyingPrice) * 100)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                  <button
                    onClick={handleAddToCart}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md",
                      addedToCart 
                        ? 'bg-emerald-500 text-white shadow-emerald-100' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 dark:shadow-none'
                    )}
                  >
                    {addedToCart ? (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5" />
                        <span>Add to POS Cart</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setProduct(null);
                      setScanning(true);
                    }}
                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
                  >
                    Scan Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Session History Sidebar (Right Column) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Session History</h3>
                </div>
                {scanHistory.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-black text-rose-500 uppercase tracking-wider hover:underline"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                {scanHistory.length > 0 ? (
                  scanHistory.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-4 rounded-xl border flex items-center justify-between transition-colors",
                        item.name === 'Product Not Found'
                          ? 'bg-rose-50/20 dark:bg-rose-500/5 border-rose-100/50 dark:border-rose-950/20'
                          : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100/60 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <div className="flex-1 pr-2">
                        <p className={cn(
                          "text-xs font-bold truncate leading-snug",
                          item.name === 'Product Not Found' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'
                        )}>
                          {item.name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 tracking-wider">CODE: {item.barcode}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className="text-[8px] font-black text-slate-400 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-2 py-0.5 rounded uppercase">
                          {item.time}
                        </span>
                        {item.name !== 'Product Not Found' && (
                          <button
                            onClick={() => lookupBarcode(item.barcode)}
                            className="p-1 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded text-blue-600"
                            title="Re-open product details"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center">
                    <HelpCircle className="h-10 w-10 text-slate-200 dark:text-slate-800 mb-3" />
                    <p className="text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">No Recent Scans</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
