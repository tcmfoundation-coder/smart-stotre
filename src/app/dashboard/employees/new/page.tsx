'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { createEmployee } from '@/lib/actions/employees';
import { getBranches } from '@/lib/actions/branches';
import { ArrowLeft, Save, User, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number'
      ? (e.target.value === '' ? 0 : parseFloat(e.target.value))
      : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Add New Employee" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/employees"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>

        {/* Form Container */}
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">New Employee</h1>
                  <p className="text-sm text-muted-foreground">Add a new employee to your workforce</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Account Information */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <User className="h-4 w-4 text-primary" />
                    Account Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="emp-name">Full Name *</Label>
                      <Input id="emp-name" type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-email">Email Address *</Label>
                      <Input id="emp-email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-password">Password *</Label>
                      <Input id="emp-password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" minLength={6} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-phone">Phone Number *</Label>
                      <Input id="emp-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 8900" />
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Employment Details
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="emp-position">Position *</Label>
                      <Input id="emp-position" type="text" name="position" value={formData.position} onChange={handleChange} required placeholder="Cashier, Manager, etc." />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-department">Department</Label>
                      <Input id="emp-department" type="text" name="department" value={formData.department} onChange={handleChange} placeholder="Sales, Operations, etc." />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-salary">Salary *</Label>
                      <Input id="emp-salary" type="number" name="salary" value={formData.salary} onChange={handleChange} required placeholder="50000" min="0" step="0.01" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-hireDate">Hire Date *</Label>
                      <Input id="emp-hireDate" type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-role">Role *</Label>
                      <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                        <SelectTrigger id="emp-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emp-branch">Branch</Label>
                      <Select value={formData.branchId || 'none'} onValueChange={(v) => setFormData({ ...formData, branchId: v === 'none' ? '' : v })}>
                        <SelectTrigger id="emp-branch">
                          <SelectValue placeholder="No Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Branch</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/employees">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={loading} isLoading={loading} className="gap-2">
                    {!loading && (
                      <>
                        <Save className="h-4 w-4" />
                        Create Employee
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
