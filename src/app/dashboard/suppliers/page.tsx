'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus, Search, Truck, Phone, Mail, Package, Wallet, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: suppliers, isLoading, error, refetch } = useSuppliers({ search: searchQuery });
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteSupplier.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Supply Chain" userRole="admin" />

      <main className="p-6 lg:p-8">
        <ErrorBoundary>
          {isLoading ? (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load suppliers" onRetry={() => refetch()} />
          ) : (
            <>
              {/* Quick Stats */}
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Partners</p>
                      <h3 className="text-3xl font-semibold text-foreground">{suppliers?.length || 0}</h3>
                      <p className="mt-2 text-sm font-medium text-primary">Verified suppliers</p>
                    </div>
                    <div className="rounded-md bg-primary/10 p-3 text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Procurement</p>
                      <h3 className="text-3xl font-semibold text-foreground">
                        {formatCurrency(suppliers?.reduce((sum: number, s: any) => sum + (s.totalPurchases || 0), 0) || 0)}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-success">Lifetime volume</p>
                    </div>
                    <div className="rounded-md bg-success/10 p-3 text-success">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding Debt</p>
                      <h3 className="text-3xl font-semibold text-foreground">
                        {formatCurrency(suppliers?.reduce((sum: number, s: any) => sum + (s.outstandingDebt || 0), 0) || 0)}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-destructive">Payables</p>
                    </div>
                    <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="mb-6 flex flex-col items-center justify-between gap-4 xl:flex-row">
                <div className="relative w-full flex-1 xl:w-96">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search suppliers by name, company, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>

                <Button asChild className="w-full gap-2 xl:w-auto">
                  <Link href="/dashboard/suppliers/new">
                    <Plus className="h-4 w-4" />
                    Add Supplier
                  </Link>
                </Button>
              </div>

              {/* Suppliers Table */}
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Total Purchases</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers?.map((supplier: any) => (
                      <TableRow key={supplier._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                              {supplier.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{supplier.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{supplier.company || 'Private Supplier'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center text-sm text-foreground">
                              <Phone className="mr-2 h-3 w-3 text-muted-foreground" /> {supplier.phone}
                            </span>
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Mail className="mr-2 h-3 w-3" /> {supplier.email || 'No email'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrency(supplier.totalPurchases)}
                        </TableCell>
                        <TableCell>
                          <span className={supplier.outstandingDebt > 0 ? 'font-medium text-destructive' : 'font-medium text-success'}>
                            {formatCurrency(supplier.outstandingDebt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{supplier.paymentTerms || 'Standard'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                              <Link href={`/dashboard/suppliers/${supplier._id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(supplier._id, supplier.name)}
                              disabled={deleteSupplier.isPending}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
