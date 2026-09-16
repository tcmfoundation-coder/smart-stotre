'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getEmployees, deleteEmployee } from '@/lib/actions/employees';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Plus, Search, DollarSign, Users, Briefcase, Edit, Trash2, X, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Human Capital" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Workforce</p>
                <h3 className="text-3xl font-semibold text-foreground">{employees.length}</h3>
                <p className="mt-2 text-sm font-medium text-primary">Active staff</p>
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly Payroll</p>
                <h3 className="text-3xl font-semibold text-foreground">
                  {formatCurrency(employees.reduce((sum: number, e: any) => sum + (e.salary || 0), 0))}
                </h3>
                <p className="mt-2 text-sm font-medium text-warning">Operating cost</p>
              </div>
              <div className="rounded-md bg-warning/10 p-3 text-warning">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Performer</p>
                <h3 className="max-w-[150px] truncate text-xl font-semibold text-foreground">
                  {topPerformer?.userId?.name || 'N/A'}
                </h3>
                <p className="mt-2 text-sm font-medium text-success">Highest sales</p>
              </div>
              <div className="rounded-md bg-success/10 p-3 text-success">
                <Briefcase className="h-5 w-5" />
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
              placeholder="Search employees by name, role, or ID..."
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

          {canManageEmployees ? (
            <Button asChild className="w-full gap-2 xl:w-auto">
              <Link href="/dashboard/employees/new">
                <Plus className="h-4 w-4" />
                Add Employee
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              Employee management is read-only for your role.
            </div>
          )}
        </div>

        {/* Employees Table */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          {loading ? (
            <div className="p-12">
              <CardSkeleton />
            </div>
          ) : error ? (
            <ErrorState
              icon={Users}
              description="Failed to load employees"
              onRetry={() => loadEmployees(searchQuery || undefined)}
            />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description={searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee: any) => (
                  <TableRow key={employee._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                          {(employee.userId?.name ?? 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{employee.userId?.name ?? '—'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{employee.userId?.email ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{employee.position}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{employee.department}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{formatCurrency(employee.performance?.totalSales || 0)}</span>
                        <p className="mt-0.5 text-xs text-muted-foreground">{employee.performance?.totalTransactions || 0} Transactions</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(employee.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {canManageEmployees ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                            <Link href={`/dashboard/employees/${employee._id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee._id)}
                            disabled={deletingId === employee._id}
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
      </main>
    </div>
  );
}
