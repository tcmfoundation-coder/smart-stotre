'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getProductById, updateProduct, getCategories } from '@/lib/actions/inventory';
import { getSuppliers } from '@/lib/actions/suppliers';
import { ArrowLeft, Package, Edit, Save, X, TrendingUp, AlertTriangle, Calendar, Box, DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/ui/kpi-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeType: 'GLOBAL' | 'INTERNAL';
  brand?: string;
  description?: string;
  categoryId: {
    _id: string;
    name: string;
  };
  branchId?: {
    _id: string;
    name: string;
  };
  images: string[];
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  unit: string;
  expiryDate?: string;
  supplierId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productData = await getProductById(id);
      setProduct(productData);
      setFormData(productData);
    } catch (err) {
      console.error('Error loading product data:', err);
      setError('Failed to load product data');
      setLoading(false);
      return;
    }

    // Categories/suppliers only populate the edit dropdowns - getSuppliers
    // requires manager/admin while viewing a product only requires being
    // authenticated, so a cashier who can see this page at all must not
    // have the product itself fail to load just because they lack
    // permission for supplier data they can't edit anyway (updateProduct
    // already enforces manager/admin server-side).
    try {
      const [categoriesData, suppliersData] = await Promise.all([getCategories(), getSuppliers()]);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Error loading product edit metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProduct(id, formData);
      setProduct({ ...product!, ...formData } as Product);
      setEditing(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(product!);
    setEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Product Details" userRole="admin" />
        <main className="flex h-64 items-center justify-center p-6 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Product Details" userRole="admin" />
        <main className="p-6 lg:p-8">
          <div className="text-center text-destructive">{error || 'Product not found'}</div>
        </main>
      </div>
    );
  }

  const isLowStock = product.stockQuantity <= product.minStockLevel;
  const isExpiringSoon = product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const profitMargin = product.sellingPrice - product.buyingPrice;
  const profitPercentage = product.buyingPrice > 0 ? ((profitMargin / product.buyingPrice) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Product Details" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/inventory"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>

        {/* Product Header */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{product.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
                  <span className="text-sm text-muted-foreground">Barcode: {product.barcode}</span>
                  <Badge variant={product.isActive ? 'success' : 'destructive'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {!editing ? (
                <Button className="flex-1 gap-2 sm:flex-none" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button className="flex-1 gap-2 sm:flex-none" onClick={handleSave} disabled={saving} isLoading={saving}>
                    {!saving && (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard
            title="Stock"
            value={`${product.stockQuantity} ${product.unit}`}
            change={isLowStock ? 'Low stock' : undefined}
            changeType={isLowStock ? 'negative' : undefined}
            icon={Box}
            variant={isLowStock ? 'destructive' : 'success'}
          />
          <KPICard title="Selling Price" value={formatCurrency(product.sellingPrice)} icon={DollarSign} variant="info" />
          <KPICard title="Profit Margin" value={`${profitPercentage}%`} change={formatCurrency(profitMargin)} icon={TrendingUp} variant="primary" />
          <KPICard
            title="Expiry Date"
            value={product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}
            change={isExpiringSoon ? 'Expiring soon' : undefined}
            changeType={isExpiringSoon ? 'negative' : undefined}
            icon={isExpiringSoon ? AlertTriangle : Calendar}
            variant={isExpiringSoon ? 'destructive' : 'info'}
          />
        </div>

        {/* Product Details Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Product Information</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prod-name">Product Name</Label>
                {editing ? (
                  <Input id="prod-name" type="text" value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-brand">Brand</Label>
                {editing ? (
                  <Input id="prod-brand" type="text" value={formData.brand || ''} onChange={(e) => handleInputChange('brand', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.brand || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sku">SKU</Label>
                {editing ? (
                  <Input id="prod-sku" type="text" value={formData.sku || ''} onChange={(e) => handleInputChange('sku', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-barcode">Barcode</Label>
                {editing ? (
                  <Input id="prod-barcode" type="text" value={formData.barcode || ''} onChange={(e) => handleInputChange('barcode', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.barcode}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-category">Category</Label>
                {editing ? (
                  <Select value={formData.categoryId?._id || ''} onValueChange={(v) => handleInputChange('categoryId', v)}>
                    <SelectTrigger id="prod-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.categoryId?.name || 'Uncategorized'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-supplier">Supplier</Label>
                {editing ? (
                  <Select value={formData.supplierId?._id || 'none'} onValueChange={(v) => handleInputChange('supplierId', v === 'none' ? undefined : v)}>
                    <SelectTrigger id="prod-supplier">
                      <SelectValue placeholder="No Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Supplier</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup._id} value={sup._id}>{sup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.supplierId?.name || 'No Supplier'}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="prod-description">Description</Label>
                {editing ? (
                  <Textarea id="prod-description" value={formData.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground">{product.description || 'No description'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory & Pricing */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Inventory & Pricing</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prod-stock">Stock Quantity</Label>
                {editing ? (
                  <Input id="prod-stock" type="number" value={formData.stockQuantity || 0} onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value))} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.stockQuantity} {product.unit}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-min-stock">Minimum Stock Level</Label>
                {editing ? (
                  <Input id="prod-min-stock" type="number" value={formData.minStockLevel || 0} onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value))} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.minStockLevel} {product.unit}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-unit">Unit</Label>
                {editing ? (
                  <Input id="prod-unit" type="text" value={formData.unit || ''} onChange={(e) => handleInputChange('unit', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.unit}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-expiry">Expiry Date</Label>
                {editing ? (
                  <Input
                    id="prod-expiry"
                    type="date"
                    value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-buying-price">Buying Price</Label>
                {editing ? (
                  <Input
                    id="prod-buying-price"
                    type="number"
                    step="0.01"
                    value={formData.buyingPrice || 0}
                    onChange={(e) => handleInputChange('buyingPrice', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{formatCurrency(product.buyingPrice)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-selling-price">Selling Price</Label>
                {editing ? (
                  <Input
                    id="prod-selling-price"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice || 0}
                    onChange={(e) => handleInputChange('sellingPrice', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{formatCurrency(product.sellingPrice)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Status</h2>

            <div className="flex items-center gap-4">
              {editing ? (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Active Product</span>
                </label>
              ) : (
                <Badge variant={product.isActive ? 'success' : 'destructive'}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
