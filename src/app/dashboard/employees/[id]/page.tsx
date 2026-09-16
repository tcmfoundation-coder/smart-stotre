'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/actions/employees';
import { ArrowLeft, Edit, Save, X, Briefcase, DollarSign, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/ui/kpi-card';

interface Employee {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  employeeId: string;
  position: string;
  department?: string;
  salary: number;
  hireDate: string;
  branchId?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  performance: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
    lastMonthSales: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const data = await getEmployeeById(id);
      setEmployee(data);
      setFormData(data);
    } catch (err) {
      console.error('Error loading employee data:', err);
      setError('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateEmployee(id, formData);
      setEmployee({ ...employee!, ...formData } as Employee);
      setEditing(false);
    } catch (err) {
      console.error('Error saving employee:', err);
      setError('Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(employee!);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        await deleteEmployee(id);
        router.push('/dashboard/employees');
      } catch (err) {
        console.error('Error deleting employee:', err);
        setError('Failed to delete employee');
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Employee Details" userRole="admin" />
        <main className="flex h-64 items-center justify-center p-6 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Employee Details" userRole="admin" />
        <main className="p-6 lg:p-8">
          <div className="text-center text-destructive">{error || 'Employee not found'}</div>
        </main>
      </div>
    );
  }

  const totalAttendanceDays = employee.attendance.present + employee.attendance.absent + employee.attendance.late;
  const attendanceRate = totalAttendanceDays > 0 ? ((employee.attendance.present / totalAttendanceDays) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Employee Details" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/employees"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>

        {/* Employee Header */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {employee.userId?.name?.charAt(0) || 'E'}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{employee.userId?.name || 'Unknown'}</h1>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{employee.employeeId}</span>
                  <Badge variant={employee.isActive ? 'success' : 'destructive'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {!editing ? (
                <>
                  <Button className="flex-1 gap-2 sm:flex-none" onClick={() => setEditing(true)}>
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive sm:flex-none"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button className="flex-1 gap-2 sm:flex-none" onClick={handleSave} disabled={saving} isLoading={saving}>
                    {!saving && (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard title="Total Sales" value={formatCurrency(employee.performance.totalSales)} icon={TrendingUp} variant="success" />
          <KPICard title="Transactions" value={employee.performance.totalTransactions} icon={Briefcase} variant="info" />
          <KPICard title="Avg Transaction" value={formatCurrency(employee.performance.averageTransactionValue)} icon={DollarSign} variant="primary" />
          <KPICard title="Attendance" value={`${attendanceRate}%`} change={`${employee.attendance.present} present`} icon={Clock} variant="warning" />
        </div>

        {/* Employee Details Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Employee Information</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-detail-name">Full Name</Label>
                {editing ? (
                  <Input
                    id="emp-detail-name"
                    type="text"
                    value={formData.userId?.name || ''}
                    onChange={(e) => handleInputChange('userId', { ...formData.userId, name: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.userId?.name || 'Unknown'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-email">Email</Label>
                {editing ? (
                  <Input
                    id="emp-detail-email"
                    type="email"
                    value={formData.userId?.email || ''}
                    onChange={(e) => handleInputChange('userId', { ...formData.userId, email: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.userId?.email || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-phone">Phone</Label>
                {editing ? (
                  <Input
                    id="emp-detail-phone"
                    type="tel"
                    value={formData.userId?.phone || ''}
                    onChange={(e) => handleInputChange('userId', { ...formData.userId, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.userId?.phone || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-position">Position</Label>
                {editing ? (
                  <Input id="emp-detail-position" type="text" value={formData.position || ''} onChange={(e) => handleInputChange('position', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.position}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-department">Department</Label>
                {editing ? (
                  <Input id="emp-detail-department" type="text" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.department || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-branch">Branch</Label>
                {editing ? (
                  <Input
                    id="emp-detail-branch"
                    type="text"
                    value={formData.branchId?.name || ''}
                    onChange={(e) => handleInputChange('branchId', { ...formData.branchId, name: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{employee.branchId?.name || 'Not assigned'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-salary">Salary</Label>
                {editing ? (
                  <Input
                    id="emp-detail-salary"
                    type="number"
                    value={formData.salary || 0}
                    onChange={(e) => handleInputChange('salary', parseFloat(e.target.value))}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{formatCurrency(employee.salary)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emp-detail-hireDate">Hire Date</Label>
                {editing ? (
                  <Input
                    id="emp-detail-hireDate"
                    type="date"
                    value={formData.hireDate ? new Date(formData.hireDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('hireDate', e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{formatDate(employee.hireDate)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Status</h2>

            <div className="flex items-center gap-4">
              {editing ? (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Active Employee</span>
                </label>
              ) : (
                <Badge variant={employee.isActive ? 'success' : 'destructive'}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
