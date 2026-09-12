'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/actions/employees';
import { ArrowLeft, Edit, Save, X, User, Phone, Mail, Briefcase, Building2, Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Employee Details" userRole="admin" />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Employee Details" userRole="admin" />
        <main className="p-8">
          <div className="text-center text-red-600">{error || 'Employee not found'}</div>
        </main>
      </div>
    );
  }

  const totalAttendanceDays = employee.attendance.present + employee.attendance.absent + employee.attendance.late;
  const attendanceRate = totalAttendanceDays > 0 ? ((employee.attendance.present / totalAttendanceDays) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Employee Details" userRole="admin" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/employees"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Employees</span>
        </Link>

        {/* Employee Header */}
        <div className="bg-card rounded-[2rem] p-8 shadow-[0_8px_30px(rgb(0,0,0,0.04)] border border-border mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 font-black text-3xl border border-blue-200 dark:border-blue-500/30">
                {employee.userId?.name?.charAt(0) || 'E'}
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground mb-2">{employee.userId?.name || 'Unknown'}</h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {employee.employeeId}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    employee.isActive 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {!editing ? (
                <>
                  <button 
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="px-6 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-6 py-3 bg-muted text-foreground/80 rounded-xl font-bold hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sales</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(employee.performance.totalSales)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transactions</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {employee.performance.totalTransactions}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Transaction</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(employee.performance.averageTransactionValue)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attendance</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {attendanceRate}%
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-2">{employee.attendance.present} present</p>
          </div>
        </div>

        {/* Employee Details Form */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8">
          <h2 className="text-xl font-black text-foreground mb-6">Employee Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.userId?.name || ''}
                  onChange={(e) => handleInputChange('userId', { ...formData.userId, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.userId?.name || 'Unknown'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={formData.userId?.email || ''}
                  onChange={(e) => handleInputChange('userId', { ...formData.userId, email: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.userId?.email || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.userId?.phone || ''}
                  onChange={(e) => handleInputChange('userId', { ...formData.userId, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.userId?.phone || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Position</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.position}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Department</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.department || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Branch</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.branchId?.name || ''}
                  onChange={(e) => handleInputChange('branchId', { ...formData.branchId, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{employee.branchId?.name || 'Not assigned'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Salary</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.salary || 0}
                  onChange={(e) => handleInputChange('salary', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formatCurrency(employee.salary)}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Hire Date</label>
              {editing ? (
                <input
                  type="date"
                  value={formData.hireDate ? new Date(formData.hireDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('hireDate', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{formatDate(employee.hireDate)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
          <h2 className="text-xl font-black text-foreground mb-6">Status</h2>
          
          <div className="flex items-center space-x-4">
            {editing ? (
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive || false}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-lg font-semibold text-foreground">Active Employee</span>
              </label>
            ) : (
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider ${
                employee.isActive 
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
