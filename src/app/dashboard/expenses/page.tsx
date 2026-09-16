'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getExpenses, deleteExpense } from '@/lib/actions/expenses';
import { Plus, Search, Wallet, PieChart, TrendingDown, Edit, Trash2, Calendar, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ExpenseForm, EXPENSE_CATEGORY_LABELS, type ExpenseRecord } from '@/components/dialogs/ExpenseForm';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
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

const categoryLabels = EXPENSE_CATEGORY_LABELS;

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
        category: category && category !== 'all' ? category : undefined,
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
      loadExpenses(searchQuery || undefined, categoryFilter);
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
      await loadExpenses(searchQuery || undefined, categoryFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  const totalExpenses = expenses.reduce((sum: number, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Expense Tracking" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly Burn</p>
                <h3 className="text-3xl font-semibold text-foreground">{formatCurrency(totalExpenses)}</h3>
                <p className="mt-2 text-sm font-medium text-destructive">Total outgoings</p>
              </div>
              <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expense Count</p>
                <h3 className="text-3xl font-semibold text-foreground">{expenses.length}</h3>
                <p className="mt-2 text-sm font-medium text-primary">Line items</p>
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <PieChart className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. Transaction</p>
                <h3 className="text-3xl font-semibold text-foreground">
                  {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
                </h3>
                <p className="mt-2 text-sm font-medium text-warning">Per item cost</p>
              </div>
              <div className="rounded-md bg-warning/10 p-3 text-warning">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 xl:flex-row">
          <div className="flex w-full items-center gap-3 xl:w-auto">
            <div className="relative flex-1 xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search expenses..."
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
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat as keyof typeof categoryLabels]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} className="w-full gap-2 xl:w-auto">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Expenses Table */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          {loading ? (
            <div className="p-12">
              <CardSkeleton />
            </div>
          ) : error ? (
            <ErrorState
              icon={Wallet}
              description="Failed to load expenses"
              onRetry={() => loadExpenses(searchQuery || undefined, categoryFilter)}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses found"
              description={searchQuery ? 'Try a different search term' : 'Add your first expense to get started'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{expense.title}</p>
                      {expense.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{expense.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-destructive">-{formatCurrency(expense.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-3 w-3" />
                        {formatDate(expense.date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">REF: {expense._id.substring(18)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="text-muted-foreground hover:text-primary">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense)}
                          disabled={deletingId === expense._id}
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
          )}
        </div>
      </main>

      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        expense={editingExpense}
        createdById={session?.user?.id}
        onSuccess={() => loadExpenses(searchQuery || undefined, categoryFilter)}
      />
    </div>
  );
}
