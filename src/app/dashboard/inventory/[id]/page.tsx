'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getProductById, updateProduct, getCategories } from '@/lib/actions/inventory';
import { getSuppliers } from '@/lib/actions/suppliers';
import { ArrowLeft, Package, Edit, Save, X, TrendingUp, AlertTriangle, Calendar, MapPin, Box, DollarSign, BarChart3 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';

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
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoriesData, suppliersData] = await Promise.all([
        getProductById(id),
        getCategories(),
        getSuppliers(),
      ]);
      setProduct(productData);
      setFormData(productData);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Error loading product data:', err);
      setError('Failed to load product data');
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
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Product Details" userRole="admin" />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Product Details" userRole="admin" />
        <main className="p-8">
          <div className="text-center text-red-600">{error || 'Product not found'}</div>
        </main>
      </div>
    );
  }

  const isLowStock = product.stockQuantity <= product.minStockLevel;
  const isExpiringSoon = product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const profitMargin = product.sellingPrice - product.buyingPrice;
  const profitPercentage = product.buyingPrice > 0 ? ((profitMargin / product.buyingPrice) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Product Details" userRole="admin" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/inventory"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Inventory</span>
        </Link>

        {/* Product Header */}
        <div className="bg-card rounded-[2rem] p-8 shadow-lg border border-border mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 rounded-2xl bg-secondary overflow-hidden flex-shrink-0 border border-border">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground mb-2">{product.name}</h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold text-muted-foreground">SKU: {product.sku}</span>
                  <span className="text-sm font-semibold text-muted-foreground">Barcode: {product.barcode}</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    product.isActive 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {!editing ? (
                <button 
                  onClick={() => setEditing(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  <Edit className="h-5 w-5" />
                  <span>Edit</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-6 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors"
                  >
                    <X className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${isLowStock ? 'bg-rose-500/10' : 'bg-emerald-500/10'} rounded-xl`}>
                <Box className={`h-6 w-6 ${isLowStock ? 'text-rose-600' : 'text-emerald-600'}`} />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stock</span>
            </div>
            <p className={`text-2xl font-black ${isLowStock ? 'text-rose-600' : 'text-foreground'}`}>
              {product.stockQuantity} {product.unit}
            </p>
            {isLowStock && (
              <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low stock
              </p>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Selling Price</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatCurrency(product.sellingPrice)}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Profit Margin</span>
            </div>
            <p className="text-2xl font-black text-foreground">{profitPercentage}%</p>
            <p className="text-xs font-semibold text-muted-foreground mt-2">{formatCurrency(profitMargin)}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${isExpiringSoon ? 'bg-rose-500/10' : 'bg-blue-500/10'} rounded-xl`}>
                <Calendar className={`h-6 w-6 ${isExpiringSoon ? 'text-rose-600' : 'text-blue-600'}`} />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</span>
            </div>
            <p className={`text-lg font-black ${isExpiringSoon ? 'text-rose-600' : 'text-foreground'}`}>
              {product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}
            </p>
            {isExpiringSoon && (
              <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expiring soon
              </p>
            )}
          </div>
        </div>

        {/* Product Details Form */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8">
          <h2 className="text-xl font-black text-foreground mb-6">Product Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Product Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Brand</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.brand || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">SKU</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.sku}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Barcode</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.barcode || ''}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.barcode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
              {editing ? (
                <select
                  value={formData.categoryId?._id || ''}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.categoryId?.name || 'Uncategorized'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Supplier</label>
              {editing ? (
                <select
                  value={formData.supplierId?._id || ''}
                  onChange={(e) => handleInputChange('supplierId', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="">No Supplier</option>
                  {suppliers.map((sup) => (
                    <option key={sup._id} value={sup._id}>{sup.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.supplierId?.name || 'No Supplier'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</label>
              {editing ? (
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none resize-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.description || 'No description'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8">
          <h2 className="text-xl font-black text-foreground mb-6">Inventory & Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Stock Quantity</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.stockQuantity || 0}
                  onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.stockQuantity} {product.unit}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Minimum Stock Level</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.minStockLevel || 0}
                  onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.minStockLevel} {product.unit}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Unit</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.unit}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expiry Date</label>
              {editing ? (
                <input
                  type="date"
                  value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Buying Price</label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.buyingPrice || 0}
                  onChange={(e) => handleInputChange('buyingPrice', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formatCurrency(product.buyingPrice)}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Selling Price</label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice || 0}
                  onChange={(e) => handleInputChange('sellingPrice', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formatCurrency(product.sellingPrice)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
          <h2 className="text-xl font-black text-foreground mb-6">Status</h2>
          
          <div className="flex items-center space-x-4">
            {editing ? (
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive || false}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-ring"
                />
                <span className="text-lg font-semibold text-foreground">Active Product</span>
              </label>
            ) : (
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider ${
                product.isActive 
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
