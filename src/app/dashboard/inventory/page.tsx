'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Plus, Search, Filter, AlertTriangle, Package, Edit, Trash2, X, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { data: session } = useSession();
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const canManageInventory = roleConfig.canManageInventory;

  const { data: products, isLoading, error, refetch } = useProducts({ search: searchQuery, category: categoryFilter || undefined });
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  const lowStockProducts = products?.filter((p: any) => p.stockQuantity <= p.minStockLevel) || [];
  const expiringProducts = products?.filter((p: any) => p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)) || [];

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteProduct.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Inventory Management" userRole="admin" />
      
      <main className="p-8">
        {/* Quick Stats / Alerts */}
        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {[1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Failed to load inventory</p>
              <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl">Retry</button>
            </div>
          ) : (
            <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-orange-600" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Low Stock Alert</p>
                <h3 className="text-3xl font-black text-foreground">{lowStockProducts.length}</h3>
                <p className="text-sm font-semibold text-orange-600 mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-2 animate-pulse"></span>
                  Needs restocking
                </p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-2xl">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-24 w-24 text-rose-600" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Expiring Soon</p>
                <h3 className="text-3xl font-black text-foreground">{expiringProducts.length}</h3>
                <p className="text-sm font-semibold text-rose-600 mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-2 animate-pulse"></span>
                  Critical attention
                </p>
              </div>
              <div className="p-4 bg-rose-500/10 rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center space-x-4 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl shadow-sm focus:ring-4 focus:ring-ring/5 focus:border-primary transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none flex items-center space-x-2 pl-12 pr-6 py-4 bg-card border border-border rounded-2xl text-muted-foreground font-bold hover:bg-secondary transition-all shadow-sm outline-none focus:ring-2 focus:ring-ring/10"
              >
                <option value="">All Categories</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <Filter className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center space-x-4 w-full xl:w-auto">
            {canManageInventory ? (
              <>
                <Link href="/dashboard/inventory/new" className="flex-1 xl:flex-none flex items-center justify-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95">
                  <Plus className="h-6 w-6" />
                  <span>ADD PRODUCT</span>
                </Link>
                <Link href="/dashboard/categories" className="flex items-center justify-center space-x-2 px-6 py-4 bg-card border border-border rounded-2xl text-muted-foreground font-bold hover:bg-secondary transition-all shadow-sm">
                  <Package className="h-5 w-5" />
                  <span>Categories</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                Inventory actions are read-only for your role.
              </div>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-card rounded-[2.5rem] shadow-lg border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <CardSkeleton />
            </div>
          ) : !products || products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">No products found</p>
              <p className="text-sm font-semibold text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Product Details</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">SKU/Barcode</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Category</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Inventory</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pricing</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Expiry</th>
                    <th className="text-right py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products?.map((product: any) => (
                  <tr key={product._id} className="group hover:bg-muted/50 transition-colors">
                    <td className="py-6 px-8">
                      <Link href={`/dashboard/inventory/${product._id}`} className="flex items-center space-x-4">
                        <div className="h-14 w-14 rounded-2xl bg-secondary overflow-hidden flex-shrink-0 border border-border">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                          <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Unit: {product.unit}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-xs font-black text-muted-foreground tracking-wider">{product.sku}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">{product.barcode}</p>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-secondary rounded-lg text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {product.categoryId?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className={`text-sm font-black ${
                          product.stockQuantity <= product.minStockLevel ? 'text-rose-600' : 'text-foreground'
                        }`}>
                          {product.stockQuantity}
                        </span>
                        <div className="w-20 h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              product.stockQuantity <= product.minStockLevel ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (product.stockQuantity / (product.minStockLevel * 5)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground line-through decoration-muted-foreground/30 mb-0.5">{formatCurrency(product.buyingPrice)}</span>
                        <span className="text-sm font-black text-primary">{formatCurrency(product.sellingPrice)}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className={`text-xs font-bold ${
                        product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                          ? 'text-rose-500'
                          : 'text-slate-500'
                      }`}>
                        {product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}
                      </p>
                    </td>
                    <td className="py-6 px-8">
                      {canManageInventory ? (
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/dashboard/inventory/${product._id}`} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600 transition-colors">
                            <Edit className="h-5 w-5" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(product._id, product.name)}
                            disabled={deleteProduct.isPending}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end text-sm font-semibold text-muted-foreground">View only</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
