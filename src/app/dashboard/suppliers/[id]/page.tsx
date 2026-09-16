'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/actions/suppliers';
import { ArrowLeft, Edit, Save, X, DollarSign, Package, TrendingUp, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/ui/kpi-card';

interface Supplier {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone: string;
  address?: string;
  productsSupplied: any[];
  totalPurchases: number;
  outstandingDebt: number;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  useEffect(() => {
    loadSupplier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const data = await getSupplierById(id);
      setSupplier(data);
      setFormData(data);
    } catch (err) {
      console.error('Error loading supplier data:', err);
      setError('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSupplier(id, formData);
      setSupplier({ ...supplier!, ...formData } as Supplier);
      setEditing(false);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(supplier!);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      try {
        await deleteSupplier(id);
        router.push('/dashboard/suppliers');
      } catch (err) {
        console.error('Error deleting supplier:', err);
        setError('Failed to delete supplier');
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Supplier Details" userRole="admin" />
        <main className="flex h-64 items-center justify-center p-6 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Supplier Details" userRole="admin" />
        <main className="p-6 lg:p-8">
          <div className="text-center text-destructive">{error || 'Supplier not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Supplier Details" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/suppliers"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>

        {/* Supplier Header */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {supplier.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{supplier.name}</h1>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{supplier.company || 'Private Supplier'}</span>
                  <Badge variant={supplier.isActive ? 'success' : 'destructive'}>
                    {supplier.isActive ? 'Active' : 'Inactive'}
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
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <KPICard title="Total Purchases" value={formatCurrency(supplier.totalPurchases)} icon={TrendingUp} variant="success" />
          <KPICard
            title="Outstanding Debt"
            value={formatCurrency(supplier.outstandingDebt)}
            icon={DollarSign}
            variant={supplier.outstandingDebt > 0 ? 'destructive' : 'info'}
          />
          <KPICard title="Products Supplied" value={supplier.productsSupplied?.length || 0} icon={Package} variant="info" />
        </div>

        {/* Supplier Details Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Supplier Information</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sup-detail-name">Contact Name</Label>
                {editing ? (
                  <Input id="sup-detail-name" type="text" value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-detail-company">Company</Label>
                {editing ? (
                  <Input id="sup-detail-company" type="text" value={formData.company || ''} onChange={(e) => handleInputChange('company', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.company || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-detail-phone">Phone</Label>
                {editing ? (
                  <Input id="sup-detail-phone" type="tel" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-detail-email">Email</Label>
                {editing ? (
                  <Input id="sup-detail-email" type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.email || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sup-detail-address">Address</Label>
                {editing ? (
                  <Input id="sup-detail-address" type="text" value={formData.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.address || 'Not specified'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-detail-terms">Payment Terms</Label>
                {editing ? (
                  <Input id="sup-detail-terms" type="text" value={formData.paymentTerms || ''} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{supplier.paymentTerms || 'Standard'}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sup-detail-notes">Notes</Label>
                {editing ? (
                  <Textarea id="sup-detail-notes" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground">{supplier.notes || 'No notes'}</p>
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
                  <span className="text-sm font-medium text-foreground">Active Supplier</span>
                </label>
              ) : (
                <Badge variant={supplier.isActive ? 'success' : 'destructive'}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
