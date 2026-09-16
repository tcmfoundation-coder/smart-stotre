'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Package, Search, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useProducts, useDeleteProduct, type Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const { data: products, isLoading, error, refetch } = useProducts({
    search: searchQuery,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    lowStock: stockFilter === 'low-stock',
    outOfStock: stockFilter === 'out-of-stock',
  });
  const { data: categories } = useCategories();

  const deleteProduct = useDeleteProduct();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct.mutate(id);
    }
  };

  const handleAddProduct = () => {
    router.push('/dashboard/inventory/new');
  };

  const handleViewProduct = (id: string) => {
    router.push(`/dashboard/inventory/${id}`);
  };

  const handleEditProduct = (id: string) => {
    router.push(`/dashboard/inventory/${id}`);
  };

  const getStockStatus = (product: Product): { label: string; variant: 'destructive' | 'warning' | 'success' } => {
    if (product.stockQuantity === 0) return { label: 'Out of Stock', variant: 'destructive' };
    if (product.stockQuantity <= (product.minStockLevel ?? 10)) return { label: 'Low Stock', variant: 'warning' };
    return { label: 'In Stock', variant: 'success' };
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Product Catalog" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative sm:w-64 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
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
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-44">
                  <SelectValue placeholder="All Stock Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full gap-2 xl:w-auto" onClick={handleAddProduct}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load products" onRetry={() => refetch()} />
          ) : !products || products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description={searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <Card key={product._id}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-foreground">{product.name}</h3>
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          <p className="text-xs text-muted-foreground">{product.barcode}</p>
                        </div>
                        <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                      </div>

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Category</span>
                          <span className="font-medium text-foreground">
                            {typeof product.categoryId === 'object' ? product.categoryId?.name || 'N/A' : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Stock</span>
                          <span className="font-medium text-foreground">{product.stockQuantity} units</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-semibold text-foreground">{formatCurrency(product.sellingPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-medium text-foreground">{formatCurrency(product.buyingPrice || 0)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewProduct(product._id)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditProduct(product._id)}
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(product._id)}
                          disabled={deleteProduct.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
