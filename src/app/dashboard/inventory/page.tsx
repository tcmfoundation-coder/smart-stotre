'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Plus, Search, AlertTriangle, Package, Edit, Trash2, X, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: session } = useSession();
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const canManageInventory = roleConfig.canManageInventory;

  const { data: products, isLoading, error, refetch } = useProducts({ search: searchQuery, category: categoryFilter === 'all' ? undefined : categoryFilter });
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Inventory Management" userRole="admin" />

      <main className="p-6 lg:p-8">
        <ErrorBoundary>
          {isLoading ? (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              {[1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load inventory" onRetry={() => refetch()} />
          ) : (
            <>
              {/* Quick Stats / Alerts */}
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Low Stock Alert</p>
                      <h3 className="text-3xl font-semibold text-foreground">{lowStockProducts.length}</h3>
                      <p className="mt-2 text-sm font-medium text-warning">Needs restocking</p>
                    </div>
                    <div className="rounded-md bg-warning/10 p-3 text-warning">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expiring Soon</p>
                      <h3 className="text-3xl font-semibold text-foreground">{expiringProducts.length}</h3>
                      <p className="mt-2 text-sm font-medium text-destructive">Critical attention</p>
                    </div>
                    <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="mb-6 flex flex-col items-center justify-between gap-4 xl:flex-row">
                <div className="flex w-full items-center gap-3 xl:w-auto">
                  <div className="relative flex-1 xl:w-96">
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
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex w-full items-center gap-3 xl:w-auto">
                  {canManageInventory ? (
                    <>
                      <Button asChild className="flex-1 gap-2 xl:flex-none">
                        <Link href="/dashboard/inventory/new">
                          <Plus className="h-4 w-4" />
                          Add Product
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="gap-2">
                        <Link href="/dashboard/categories">
                          <Package className="h-4 w-4" />
                          Categories
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
                      <Lock className="h-4 w-4" />
                      Inventory actions are read-only for your role.
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Table */}
              <div className="rounded-lg border border-border bg-card shadow-sm">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <CardSkeleton />
                  </div>
                ) : !products || products.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No products found"
                    description={searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Details</TableHead>
                        <TableHead>SKU/Barcode</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product: any) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <Link href={`/dashboard/inventory/${product._id}`} className="flex items-center gap-3">
                              <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                {product.images?.[0] ? (
                                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground hover:text-primary">{product.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Unit: {product.unit}</p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-foreground">{product.sku}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{product.barcode}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.categoryId?.name || 'Uncategorized'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={product.stockQuantity <= product.minStockLevel ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-foreground'}>
                                {product.stockQuantity}
                              </span>
                              <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={product.stockQuantity <= product.minStockLevel ? 'h-full rounded-full bg-destructive' : 'h-full rounded-full bg-success'}
                                  style={{ width: `${Math.min(100, (product.stockQuantity / (product.minStockLevel * 5)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">{formatCurrency(product.buyingPrice)}</span>
                              <span className="text-sm font-semibold text-primary">{formatCurrency(product.sellingPrice)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className={
                              product.expiryDate && new Date(product.expiryDate) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                                ? 'text-xs font-medium text-destructive'
                                : 'text-xs text-muted-foreground'
                            }>
                              {product.expiryDate ? formatDate(product.expiryDate) : 'No Expiry'}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManageInventory ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                                  <Link href={`/dashboard/inventory/${product._id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(product._id, product.name)}
                                  disabled={deleteProduct.isPending}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">View only</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
