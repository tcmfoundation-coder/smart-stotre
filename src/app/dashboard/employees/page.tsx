'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getEmployees, deleteEmployee } from '@/lib/actions/employees';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Plus, Search, DollarSign, Users, Briefcase, Calendar, Edit, Trash2, Mail, Phone, X, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: session } = useSession();
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const canManageEmployees = roleConfig.canManageEmployees;
  const topPerformer = employees.reduce((best, e) => {
    if (!best) return e;
    return (e.performance?.totalSales || 0) > (best.performance?.totalSales || 0) ? e : best;
  }, null as (typeof employees)[number] | null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async (search?: string) => {
    try {
      setLoading(true);
      setError(false);
      const data = await getEmployees(search ? { search } : undefined);
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 0) {
        loadEmployees(searchQuery);
      } else if (searchQuery.length === 0) {
        loadEmployees();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) {
      return;
    }
    setDeletingId(employeeId);
    try {
      await deleteEmployee(employeeId);
      toast.success('Employee deleted successfully');
      await loadEmployees(searchQuery || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Human Capital" userRole="admin" />
      
      <main className="p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Workforce</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{employees.length}</h3>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">Active staff</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Monthly Payroll</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(employees.reduce((sum: number, e: any) => sum + (e.salary || 0), 0))}
                </h3>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">Operating cost</p>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                <DollarSign className="h-8 w-8 text-rose-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Top Performer</p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">
                  {topPerformer?.userId?.name || 'N/A'}
                </h3>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">Highest sales</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <Briefcase className="h-8 w-8 text-emerald-600" />
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
              placeholder="Search employees by name, role, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-slate-900 dark:text-white font-semibold outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {canManageEmployees ? (
            <Link href="/dashboard/employees/new" className="w-full xl:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95">
              <Plus className="h-6 w-6" />
              <span>ADD EMPLOYEE</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <Lock className="h-4 w-4" />
              Employee management is read-only for your role.
            </div>
          )}
        </div>

        {/* Employees Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading employees...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load employees</p>
              <button
                onClick={() => loadEmployees(searchQuery || undefined)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No employees found</p>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Employee Profile</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Designation</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Department</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Performance</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Joined</th>
                    <th className="text-right py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((employee: any) => (
                  <tr key={employee._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 font-black shadow-sm border border-slate-200 dark:border-slate-700">
                          {(employee.userId?.name ?? 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{employee.userId?.name ?? '—'}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{employee.userId?.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
                        {employee.position}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{employee.department}</p>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(employee.performance?.totalSales || 0)}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{employee.performance?.totalTransactions || 0} Transactions</p>
                      </div>
                    </td>
                    <td className="py-6 px-8 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {formatDate(employee.createdAt)}
                    </td>
                    <td className="py-6 px-8 text-right">
                      {canManageEmployees ? (
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/dashboard/employees/${employee._id}`} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600 transition-colors">
                            <Edit className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(employee._id)}
                            disabled={deletingId === employee._id}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
