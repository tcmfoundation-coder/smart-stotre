'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/actions/suppliers';
import { ArrowLeft, Edit, Save, X, Truck, Phone, Mail, MapPin, Building2, FileText, DollarSign, Package, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Supplier Details" userRole="admin" />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Supplier Details" userRole="admin" />
        <main className="p-8">
          <div className="text-center text-red-600">{error || 'Supplier not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Supplier Details" userRole="admin" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/suppliers"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Suppliers</span>
        </Link>

        {/* Supplier Header */}
        <div className="bg-card rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 font-black text-3xl border border-indigo-200 dark:border-indigo-500/30">
                {supplier.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground mb-2">{supplier.name}</h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {supplier.company || 'Private Supplier'}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    supplier.isActive 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {supplier.isActive ? 'Active' : 'Inactive'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Purchases</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(supplier.totalPurchases)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${supplier.outstandingDebt > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-blue-50 dark:bg-blue-500/10'} rounded-xl`}>
                <DollarSign className={`h-6 w-6 ${supplier.outstandingDebt > 0 ? 'text-rose-600' : 'text-blue-600'}`} />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding Debt</span>
            </div>
            <p className={`text-2xl font-black ${supplier.outstandingDebt > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {formatCurrency(supplier.outstandingDebt)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Products Supplied</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {supplier.productsSupplied?.length || 0}
            </p>
          </div>
        </div>

        {/* Supplier Details Form */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8">
          <h2 className="text-xl font-black text-foreground mb-6">Supplier Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Contact Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Company</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.company || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.email || 'Not specified'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Address</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.address || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment Terms</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.paymentTerms || 'Standard'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</label>
              {editing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none resize-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{supplier.notes || 'No notes'}</p>
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
                <span className="text-lg font-semibold text-foreground">Active Supplier</span>
              </label>
            ) : (
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider ${
                supplier.isActive 
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
