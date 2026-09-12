'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus, Search, Truck, Phone, Mail, Package, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Supply Chain" userRole="admin" />
      
      <main className="p-8">
        {/* Quick Stats */}
        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Failed to load suppliers</p>
              <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl">Retry</button>
            </div>
          ) : (
            <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Partners</p>
                <h3 className="text-3xl font-black text-foreground">{suppliers?.length || 0}</h3>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">Verified suppliers</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Procurement</p>
                <h3 className="text-3xl font-black text-foreground">
                  {formatCurrency(suppliers?.reduce((sum: number, s: any) => sum + (s.totalPurchases || 0), 0) || 0)}
                </h3>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">Lifetime volume</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <Package className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="group bg-card rounded-[2rem] p-8 border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Outstanding Debt</p>
                <h3 className="text-3xl font-black text-foreground">
                  {formatCurrency(suppliers?.reduce((sum: number, s: any) => sum + (s.outstandingDebt || 0), 0) || 0)}
                </h3>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">Payables</p>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                <Plus className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="relative flex-1 xl:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search suppliers by name, company, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Link href="/dashboard/suppliers/new" className="w-full xl:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95">
            <Plus className="h-6 w-6" />
            <span>ADD SUPPLIER</span>
          </Link>
        </div>

        {/* Suppliers Table */}
        <div className="bg-card rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Supplier Entity</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Communication</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Purchases</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Balance Due</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Terms</th>
                  <th className="text-right py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers?.map((supplier: any) => (
                  <tr key={supplier._id} className="group hover:bg-muted/50 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-indigo-600 font-black shadow-sm border border-border">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-blue-600 transition-colors">{supplier.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{supplier.company || 'Private Supplier'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold text-foreground/80 flex items-center">
                          <Phone className="h-3 w-3 mr-2 text-slate-400" /> {supplier.phone}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-2 text-slate-400" /> {supplier.email || 'No email'}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-sm font-black text-foreground">
                      {formatCurrency(supplier.totalPurchases)}
                    </td>
                    <td className="py-6 px-8">
                      <span className={`text-sm font-black ${
                        supplier.outstandingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {formatCurrency(supplier.outstandingDebt)}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-muted rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {supplier.paymentTerms || 'Standard'}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link href={`/dashboard/suppliers/${supplier._id}`} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600 transition-colors">
                          <Edit className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(supplier._id, supplier.name)}
                          disabled={deleteSupplier.isPending}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
