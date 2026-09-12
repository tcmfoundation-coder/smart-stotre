'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { createEmployee } from '@/lib/actions/employees';
import { getBranches } from '@/lib/actions/branches';
import { ArrowLeft, Save, User, Phone, Mail, Briefcase, Building2, Calendar, DollarSign, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    department: '',
    salary: 0,
    hireDate: new Date().toISOString().split('T')[0],
    branchId: '',
    role: 'cashier',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createEmployee({
        ...formData,
        salary: Number(formData.salary),
        hireDate: new Date(formData.hireDate),
      });
      router.push('/dashboard/employees');
    } catch (err) {
      console.error('Error creating employee:', err);
      setError('Failed to create employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' 
      ? (e.target.value === '' ? 0 : parseFloat(e.target.value)) 
      : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Add New Employee" userRole="admin" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/employees"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Employees</span>
        </Link>

        {/* Form Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-[2rem] p-8 shadow-[0_8px_30px(rgb(0,0,0,0.04)] border border-border">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">New Employee</h1>
                <p className="text-sm font-semibold text-muted-foreground">Add a new employee to your workforce</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Account Information */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Account Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+1 234 567 8900"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                  Employment Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Position *
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      placeholder="Cashier, Manager, etc."
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Sales, Operations, etc."
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Salary *
                    </label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      required
                      placeholder="50000"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Hire Date *
                    </label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Branch
                    </label>
                    <select
                      name="branchId"
                      value={formData.branchId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    >
                      <option value="">No Branch</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
                <Link
                  href="/dashboard/employees"
                  className="px-6 py-3 bg-muted text-foreground/80 rounded-xl font-bold hover:bg-muted transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? 'Creating...' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
