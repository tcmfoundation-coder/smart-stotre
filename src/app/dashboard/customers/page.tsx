'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus, Search, Edit, Trash2, Award, Phone, Mail, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const CUSTOMER_TYPE_VARIANT: Record<string, BadgeProps['variant']> = {
  vip: 'warning',
  corporate: 'info',
  registered: 'success',
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading, error, refetch } = useCustomers({ search: searchQuery });
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteCustomer.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Customer Intelligence" userRole="manager" />

      <main className="p-6 lg:p-8">
        <ErrorBoundary>
          {isLoading ? (
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load customers" onRetry={() => refetch()} />
          ) : (
            <>
              {/* Quick Stats */}
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Database</p>
                      <h3 className="text-3xl font-semibold text-foreground">{customers?.length || 0}</h3>
                      <p className="mt-2 text-sm font-medium text-primary">Active accounts</p>
                    </div>
                    <div className="rounded-md bg-primary/10 p-3 text-primary">
                      <Search className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</p>
                      <h3 className="text-3xl font-semibold text-foreground">
                        {formatCurrency(customers?.reduce((sum: number, c: Customer) => sum + c.totalSpent, 0) || 0)}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-success">Lifetime value</p>
                    </div>
                    <div className="rounded-md bg-success/10 p-3 text-success">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Loyalty Points</p>
                      <h3 className="text-3xl font-semibold text-foreground">
                        {customers?.reduce((sum: number, c: Customer) => sum + c.loyaltyPoints, 0) || 0}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-warning">Reward pool</p>
                    </div>
                    <div className="rounded-md bg-warning/10 p-3 text-warning">
                      <Award className="h-5 w-5" />
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
                    placeholder="Search customers by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>

                <div className="flex w-full items-center gap-3 xl:w-auto">
                  <Button variant="outline" asChild className="flex-1 gap-2 xl:flex-none">
                    <Link href="/dashboard/customers/analytics">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 gap-2 xl:flex-none">
                    <Link href="/dashboard/customers/new">
                      <Plus className="h-4 w-4" />
                      Add Customer
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Customers Table */}
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Loyalty</TableHead>
                      <TableHead>Lifetime Value</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers?.map((customer: Customer) => (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                              {customer.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{customer.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">ID: {customer._id.substring(18)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center text-sm text-foreground">
                              <Phone className="mr-2 h-3 w-3 text-muted-foreground" /> {customer.phone}
                            </span>
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Mail className="mr-2 h-3 w-3" /> {customer.email || 'No email'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={CUSTOMER_TYPE_VARIANT[customer.customerType || ''] || 'secondary'} className="capitalize">
                            {customer.customerType || 'walk-in'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Award className="h-4 w-4 text-warning" />
                            <span className="font-medium text-foreground">{customer.loyaltyPoints}</span>
                            <span className="text-xs text-muted-foreground">pts</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{formatCurrency(customer.totalSpent)}</p>
                          <p className="mt-0.5 text-xs text-success">{customer.purchaseCount} Sales</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(customer.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                              <Link href={`/dashboard/customers/${customer._id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer._id, customer.name)}
                              disabled={deleteCustomer.isPending}
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
