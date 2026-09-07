'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getExpenses, deleteExpense } from '@/lib/actions/expenses';
import { Plus, Search, Wallet, PieChart, TrendingDown, Edit, Trash2, Calendar, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ExpenseForm, EXPENSE_CATEGORY_LABELS, type ExpenseRecord } from '@/components/dialogs/ExpenseForm';

const categoryLabels = EXPENSE_CATEGORY_LABELS;

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = Object.keys(categoryLabels);

  const loadExpenses = async (search?: string, category?: string) => {
    try {
      setLoading(true);
      setError(false);
      const data = await getExpenses({
        search: search || undefined,
        category: category || undefined,
      });
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadExpenses();
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpenses(searchQuery || undefined, categoryFilter || undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter]);

  const handleCreate = () => {
    setFormMode('create');
    setEditingExpense(undefined);
    setFormOpen(true);
  };

  const handleEdit = (expense: ExpenseRecord) => {
    setFormMode('edit');
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = async (expense: ExpenseRecord) => {
    if (!confirm(`Delete expense "${expense.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(expense._id);
    try {
      await deleteExpense(expense._id);
      toast.success('Expense deleted successfully');
      await loadExpenses(searchQuery || undefined, categoryFilter || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  const totalExpenses = expenses.reduce((sum: number, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Expense Tracking" userRole="admin" />
      
      <main className="p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Monthly Burn</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(totalExpenses)}</h3>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">Total outgoings</p>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                <TrendingDown className="h-8 w-8 text-rose-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Expense Count</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{expenses.length}</h3>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">Line items</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <PieChart className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Avg. Transaction</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
                </h3>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-2">Per item cost</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
                <Wallet className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center space-x-4 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search expenses..."
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10 appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{categoryLabels[cat as keyof typeof categoryLabels]}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            className="w-full xl:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <Plus className="h-6 w-6" />
            <span>ADD EXPENSE</span>
          </button>
        </div>

        {/* Expenses Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading expenses...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <Wallet className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load expenses</p>
              <button
                onClick={() => loadExpenses(searchQuery || undefined, categoryFilter || undefined)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No expenses found</p>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery ? 'Try a different search term' : 'Add your first expense to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Transaction Detail</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Category</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Reference</th>
                    <th className="text-right py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((expense) => (
                  <tr key={expense._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-6 px-8">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{expense.title}</p>
                        {expense.description && (
                          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{expense.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        {categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">-{formatCurrency(expense.amount)}</span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3 mr-2 opacity-50" />
                        {formatDate(expense.date)}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">REF: {expense._id.substring(18)}</p>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl text-blue-600 transition-colors"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          disabled={deletingId === expense._id}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors disabled:opacity-50"
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
          )}
        </div>
      </main>

      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        expense={editingExpense}
        createdById={session?.user?.id}
        onSuccess={() => loadExpenses(searchQuery || undefined, categoryFilter || undefined)}
      />
    </div>
  );
}
