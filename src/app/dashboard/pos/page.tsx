'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Scan, Plus, Minus, Trash2, CreditCard, DollarSign,
  Smartphone, Printer, ShoppingCart, Phone, User as UserIcon, Mail,
  AlertCircle, Receipt
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Dynamically import BarcodeScanner to avoid SSR issues
const BarcodeScanner = dynamic(() => import('@/components/barcode-scanner'), { ssr: false });

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

const CART_KEY = 'smartmart-cart';

export default function POSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered' | 'vip' | 'corporate'>('walk-in');
  const [customer, setCustomer] = useState<any>(null);
  const [phoneError, setPhoneError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'paystack'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = 0;
  const discount = 0;
  const total = subtotal - discount + tax;
  const change = parseFloat(cashReceived || '0') - total;

  // ── Phone validation ────────────────────────────────────────────────────────
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if it's a valid Nigerian phone number (10 or 11 digits)
    // or international format (with country code)
    if (cleanPhone.length === 10) {
      // Nigerian format without leading 0
      return /^([7-9][0-9]{9})$/.test(cleanPhone);
    } else if (cleanPhone.length === 11) {
      // Nigerian format with leading 0
      return /^0([7-9][0-9]{9})$/.test(cleanPhone);
    } else if (cleanPhone.length >= 12 && cleanPhone.length <= 15) {
      // International format
      return /^\+?[1-9][0-9]{10,14}$/.test(cleanPhone);
    }

    return false;
  };

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);

    if (value && !validatePhoneNumber(value)) {
      setPhoneError('Invalid phone number format');
    } else if (value && validatePhoneNumber(value)) {
      setPhoneError('');
    } else {
      setPhoneError('');
    }
  };

  // ── localStorage sync ──────────────────────────────────────────────────────
  // Load cart from localStorage on mount (picks up items added via barcode page)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
    }
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }, [cart]);

  // ── Customer lookup ────────────────────────────────────────────────────────
  const lookupCustomer = async (phone: string) => {
    if (phone.length < 10) return;
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phone}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCustomer(data.data);
        setCustomerName(data.data.name || '');
        setCustomerEmail(data.data.email || '');
        setCustomerType(data.data.customerType || 'walk-in');
      } else {
        setCustomer(null);
        setCustomerType('walk-in');
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (customerPhone) lookupCustomer(customerPhone); }, 500);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  // ── Product search ─────────────────────────────────────────────────────────
  const searchProducts = async (query: string) => {
    try {
      const res = await fetch(`/api/pos/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchProducts(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ── Cart operations ────────────────────────────────────────────────────────
  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.sellingPrice,
          quantity: 1,
          total: product.sellingPrice,
        },
      ];
    });
    toast.success(`"${product.name}" added to cart`);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, total: newQty * item.price };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_KEY);
  };

  // ── Barcode scanner handler ────────────────────────────────────────────────
  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false);
    try {
      const res = await fetch(`/api/pos/barcode/${barcode}`);
      const data = await res.json();
      if (data.success && data.data) {
        addToCart(data.data);
      } else {
        toast.error(`No product found for barcode: ${barcode}`);
      }
    } catch {
      toast.error('Failed to look up scanned barcode.');
    }
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty. Add products first.'); return; }
    if (paymentMethod === 'cash' && parseFloat(cashReceived || '0') < total) {
      toast.error('Cash received is less than the total amount.'); return;
    }

    // Phone validation
    if (customerPhone && !validatePhoneNumber(customerPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone,
          customerName,
          customerEmail,
          customerType,
          customerId: customer?._id,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod,
          cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : total,
          notes: '',
        }),
      });

      const data = await res.json();

      if (data.success) {
        const salePayload = { ...data.data, cart, total, paymentMethod, cashReceived, change, customerName, customerPhone, customerType };
        setCompletedSale(salePayload);
        setShowReceipt(true);
        clearCart();
        setCustomerPhone(''); setCustomerName(''); setCustomerEmail(''); setCustomerType('walk-in');
        setCustomer(null); setCashReceived(''); setPhoneError('');
        toast.success('Sale completed successfully!');
      } else {
        toast.error(data.error || 'Failed to complete the sale.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Point of Sale" userRole="cashier" />

      {/* Barcode Scanner */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            onScanSuccess={handleBarcodeScan}
            onScanFailure={(err) => toast.error('Camera blocked: ' + err)}
            onClose={() => setScannerOpen(false)}
            className="aspect-video w-full"
          />
          <p className="text-center text-xs text-muted-foreground">Point camera at product barcode</p>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog open={showReceipt && !!completedSale} onOpenChange={(open) => { if (!open) { setShowReceipt(false); setCompletedSale(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {completedSale && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <Receipt className="h-7 w-7 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Sale Complete</h3>
                <p className="mt-1 text-sm text-muted-foreground">Transaction recorded successfully</p>
              </div>

              <div className="mb-4 space-y-2">
                {completedSale.cart?.map((item: CartItem) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.name} × {item.quantity}</span>
                    <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="capitalize text-foreground">{completedSale.paymentMethod}</span>
                </div>
                {completedSale.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cash Received</span>
                      <span className="text-foreground">{formatCurrency(parseFloat(completedSale.cashReceived || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Change</span>
                      <span className="text-success">{formatCurrency(completedSale.change || 0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCurrency(completedSale.total)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.print()} className="flex-1 gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => { setShowReceipt(false); setCompletedSale(null); }} className="flex-1">
                  New Sale
                </Button>
                <Button
                  onClick={() => {
                    setShowReceipt(false);
                    setCompletedSale(null);
                    if (completedSale?._id) {
                      router.push(`/dashboard/receipts/${completedSale._id}`);
                    }
                  }}
                  className="flex-1"
                >
                  Open Receipt
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <main className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left – Product Search ───────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products by name, SKU, or barcode..."
                      className="h-11 pl-9"
                    />
                  </div>
                  <Button onClick={() => setScannerOpen(true)} className="gap-2">
                    <Scan className="h-4 w-4" />
                    Scan
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {searchResults.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => addToCart(product)}
                        className="group rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                      >
                        {product.images?.[0] && (
                          <div className="mb-2 h-20 overflow-hidden rounded-sm">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.name}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">{product.sku}</p>
                        <p className="mt-1.5 text-sm font-semibold text-primary">
                          {formatCurrency(product.sellingPrice)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Category shortcuts */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {['Beverages', 'Snacks', 'Dairy', 'Groceries', 'Personal Care', 'Household', 'Electronics', 'Others'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat)}
                  className="rounded-md border border-border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <p className="text-sm font-medium text-foreground">{cat}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Right – Cart ────────────────────────────────────────────── */}
          <Card className="h-fit lg:sticky lg:top-6">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Shopping Cart</h3>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCart}
                    className="text-muted-foreground hover:text-destructive"
                    title="Clear cart"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Customer info */}
              <div className="mb-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pos-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pos-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="09031585429 or +2349031585429"
                      className={cn('pl-9', phoneError && 'border-destructive focus-visible:ring-destructive/20')}
                    />
                  </div>
                  {phoneError && (
                    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {phoneError}
                    </p>
                  )}
                  {customer && (
                    <div className="rounded-md border border-success/20 bg-success/10 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-success">Returning Customer</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.loyaltyPoints} pts · {formatCurrency(customer.totalSpent)} spent · {customer.customerType || 'walk-in'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pos-customer-type">Customer Type</Label>
                  <Select value={customerType} onValueChange={(v) => setCustomerType(v as typeof customerType)}>
                    <SelectTrigger id="pos-customer-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                      <SelectItem value="registered">Registered Customer</SelectItem>
                      <SelectItem value="vip">VIP Customer</SelectItem>
                      <SelectItem value="corporate">Corporate Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pos-name">Customer Name</Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pos-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in customer"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pos-email">Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pos-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Cart items */}
              <div className="custom-scrollbar mb-6 max-h-[350px] space-y-2 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border py-12 text-center">
                    <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">Cart is empty</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Search products or scan a barcode</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between rounded-md border border-transparent bg-muted/40 p-3 transition-colors hover:border-border"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate text-sm font-medium leading-tight text-foreground">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.sku}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="rounded-sm p-1 transition-colors hover:bg-accent">
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="rounded-sm p-1 transition-colors hover:bg-accent">
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="mb-6 space-y-2 rounded-md bg-muted/40 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-lg font-semibold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="mb-5">
                <Label>Payment Method</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: 'cash', icon: DollarSign, label: 'Cash' },
                    { id: 'card', icon: CreditCard, label: 'Card' },
                    { id: 'transfer', icon: Smartphone, label: 'Transfer' },
                    { id: 'paystack', icon: Smartphone, label: 'Paystack' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors',
                        paymentMethod === method.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent/50'
                      )}
                    >
                      <method.icon className="h-4 w-4" />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash received input */}
              {paymentMethod === 'cash' && (
                <div className="mb-5 space-y-1.5">
                  <Label htmlFor="pos-cash-received">Cash Received</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">₦</span>
                    <Input
                      id="pos-cash-received"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      className="h-12 pl-8 text-lg font-semibold"
                    />
                  </div>
                  {parseFloat(cashReceived) >= total && total > 0 && (
                    <div className="rounded-md border border-success/20 bg-success/10 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-success">Change to return</p>
                      <p className="text-lg font-semibold text-success">{formatCurrency(change)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout button */}
              <Button
                size="lg"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                isLoading={loading}
                className="w-full gap-2"
              >
                {!loading && (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>Complete Sale</span>
                    {cart.length > 0 && (
                      <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
                        {cart.length} items
                      </span>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
