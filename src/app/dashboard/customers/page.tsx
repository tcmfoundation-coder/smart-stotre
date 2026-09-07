'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus, Search, Edit, Trash2, Award, Phone, Mail, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useCustomers, useDeleteCustomer, type Customer } from '@/hooks/useCustomers';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Customer Intelligence" userRole="manager" />
      
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
              <p className="text-red-500">Failed to load customers</p>
              <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl">Retry</button>
            </div>
          ) : (
            <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Database</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{customers?.length || 0}</h3>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">Active accounts</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(customers?.reduce((sum: number, c: Customer) => sum + c.totalSpent, 0) || 0)}
                </h3>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">Lifetime value</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <Award className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Loyalty Points</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {customers?.reduce((sum: number, c: Customer) => sum + c.loyaltyPoints, 0) || 0}
                </h3>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-2">Reward pool</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
                <Award className="h-8 w-8 text-orange-600" />
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
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-slate-900 dark:text-white font-semibold outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <Link href="/dashboard/customers/analytics" className="flex-1 xl:flex-none flex items-center justify-center space-x-2 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">
              <BarChart3 className="h-5 w-5" />
              <span>ANALYTICS</span>
            </Link>
            <Link href="/dashboard/customers/new" className="flex-1 xl:flex-none flex items-center justify-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95">
              <Plus className="h-6 w-6" />
              <span>ADD CUSTOMER</span>
            </Link>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Customer Profile</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Contact / Info</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Type</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Loyalty Status</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Lifetime Value</th>
                  <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Last Seen</th>
                  <th className="text-right py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers?.map((customer: Customer) => (
                  <tr key={customer._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 dark:shadow-none">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{customer.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">ID: {customer._id.substring(18)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                          <Phone className="h-3 w-3 mr-2 text-slate-400" /> {customer.phone}
                        </span>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center">
                          <Mail className="h-3 w-3 mr-2 text-slate-400" /> {customer.email || 'No email'}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        customer.customerType === 'vip' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                        customer.customerType === 'corporate' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                        customer.customerType === 'registered' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      }`}>
                        {customer.customerType || 'walk-in'}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-black text-slate-900 dark:text-white">{customer.loyaltyPoints}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pts</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mt-1">{customer.purchaseCount} Sales</p>
                    </td>
                    <td className="py-6 px-8 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {new Date(customer.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          href={`/dashboard/customers/${customer._id}`}
                          className="inline-flex items-center space-x-1 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-bold text-xs uppercase tracking-wider"
                        >
                          <span>View</span>
                        </Link>
                        <Link
                          href={`/dashboard/customers/${customer._id}`}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600 transition-colors"
                        >
                          <Edit className="h-5 w-5" />
                        </Link>
                        <button 
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors"
                          onClick={() => handleDelete(customer._id, customer.name)}
                          disabled={deleteCustomer.isPending}
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
