'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus, AlertCircle, Barcode, Search } from 'lucide-react';
import { createProduct } from '@/lib/actions/inventory';
import { useCategories } from '@/hooks/useCategories';
import { generateBarcode } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const [barcode, setBarcode] = useState('');
  const [barcodeType, setBarcodeType] = useState<'GLOBAL' | 'INTERNAL'>('INTERNAL');
  const [barcodeMessage, setBarcodeMessage] = useState('');
  const [barcodeMessageColor, setBarcodeMessageColor] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    description: '',
    buyingPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockLevel: '10',
    unit: '',
    expiryDate: '',
  });

  useEffect(() => {
    // Auto-focus on barcode input when page loads
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const handleBarcodeLookup = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;

    setBarcodeLoading(true);
    setBarcodeMessage('');
    setBarcodeMessageColor('');

    try {
      const response = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcodeValue)}`);
      const result = await response.json();

      if (result.success && result.found && result.data) {
        // Product found - populate form fields
        setFormData({
          ...formData,
          name: result.data.name || '',
          brand: result.data.brand || '',
          description: result.data.description || '',
        });

        // Try to match category
        if (result.data.category) {
          const matchedCategory = categories.find(
            (cat) => cat.name.toLowerCase() === result.data.category.toLowerCase()
          );
          if (matchedCategory) {
            setFormData((prev) => ({ ...prev, categoryId: matchedCategory._id }));
          }
        }

        setBarcodeType('GLOBAL');
        setBarcodeMessage('Product found! Fields auto-populated from global database.');
        setBarcodeMessageColor('text-success');
      } else {
        // Product not found - let user know they can enter manually
        setBarcodeType('GLOBAL');
        setBarcodeMessage('Product not found in global database. Please enter details manually.');
        setBarcodeMessageColor('text-warning');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setBarcodeMessage('Error looking up barcode. Please try again.');
      setBarcodeMessageColor('text-destructive');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBarcodeLookup(barcode);
  };

  const handleGenerateInternalBarcode = () => {
    const internalBarcode = generateBarcode();
    setBarcode(internalBarcode);
    setBarcodeType('INTERNAL');
    setBarcodeMessage('Internal barcode generated for in-house/bakery items.');
    setBarcodeMessageColor('text-info');

    // Clear form fields for manual entry
    setFormData({
      ...formData,
      name: '',
      brand: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createProduct({
        ...formData,
        barcode,
        barcodeType,
        buyingPrice: parseFloat(formData.buyingPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stockQuantity: parseInt(formData.stockQuantity),
        minStockLevel: parseInt(formData.minStockLevel),
      });
      router.push('/dashboard/inventory');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Add New Product" userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-border bg-card p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Barcode Scanning Section */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-foreground">Barcode Scanning</h3>

                <div className="space-y-3">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="barcode">Scan or Enter Barcode</Label>
                      <div className="relative">
                        <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="barcode"
                          ref={barcodeInputRef}
                          type="text"
                          required
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleBarcodeLookup(barcode);
                            }
                          }}
                          placeholder="Scan barcode or type manually..."
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        onClick={handleBarcodeSubmit}
                        disabled={barcodeLoading || !barcode.trim()}
                        isLoading={barcodeLoading}
                        className="gap-2"
                      >
                        {!barcodeLoading && (
                          <>
                            <Search className="h-4 w-4" />
                            Lookup
                          </>
                        )}
                      </Button>

                      <Button type="button" variant="secondary" onClick={handleGenerateInternalBarcode} className="gap-2">
                        <Barcode className="h-4 w-4" />
                        Generate Internal
                      </Button>
                    </div>
                  </div>

                  {barcodeMessage && (
                    <div className={`flex items-center gap-2 text-sm font-medium ${barcodeMessageColor}`}>
                      <AlertCircle className="h-4 w-4" />
                      <span>{barcodeMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Barcode Type:</span>
                    <span className={`rounded-md px-2 py-0.5 font-medium ${barcodeType === 'GLOBAL' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}`}>
                      {barcodeType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-foreground">Basic Information</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Brand/Manufacturer</Label>
                    <Input
                      id="brand"
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select
                      required
                      name="categoryId"
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                      disabled={categoriesLoading || categories.length === 0}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!categoriesLoading && categories.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No categories yet —{' '}
                        <Link href="/dashboard/categories" className="text-primary underline-offset-2 hover:underline">
                          create one first
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-foreground">Pricing &amp; Revenue</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="buyingPrice">Buying Price (₦)</Label>
                    <Input
                      id="buyingPrice"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.buyingPrice}
                      onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sellingPrice">Selling Price (₦)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="text-lg font-semibold text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-foreground">Inventory Control</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      required
                      min="0"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minStockLevel">Min Stock Level</Label>
                    <Input
                      id="minStockLevel"
                      type="number"
                      min="0"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unit">Measurement Unit</Label>
                    <Input
                      id="unit"
                      type="text"
                      required
                      placeholder="e.g. kg, pcs, box"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Expiry & Logistics */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <h3 className="mb-4 text-base font-semibold text-foreground">Logistics</h3>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="mb-[2.75rem]" /> {/* Spacer to align with Expiry */}
                  <Label htmlFor="sku">SKU (Auto-generated)</Label>
                  <Input id="sku" type="text" disabled placeholder="Will be generated on save" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center justify-end gap-3 border-t border-border pt-8 md:flex-row">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full md:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} isLoading={loading} className="w-full gap-2 md:w-auto">
                  {!loading && (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Product
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
