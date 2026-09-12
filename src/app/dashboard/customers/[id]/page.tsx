'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getCustomerById, getCustomerPurchaseHistory, updateCustomer, deleteCustomer } from '@/lib/actions/customers';
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, Award, Calendar, TrendingUp, Package, Edit, Save, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: 'walk-in' | 'registered' | 'vip' | 'corporate';
  loyaltyPoints: number;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseDate: string;
  favoriteProducts: any[];
  favoriteCategories: any[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Sale {
  _id: string;
  saleNumber: string;
  items: any[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  cashierId: {
    name: string;
  };
  branchId: {
    name: string;
  };
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        setLoading(true);
        const [customerData, historyData] = await Promise.all([
          getCustomerById(id),
          getCustomerPurchaseHistory(id),
        ]);
        setCustomer(customerData);
        setFormData(customerData);
        setPurchaseHistory(historyData);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [id]);

  const handleInputChange = (field: keyof Customer, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCustomer(id, formData);
      setCustomer({ ...customer!, ...formData } as Customer);
      setEditing(false);
      toast.success('Customer updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(customer!);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
      router.push('/dashboard/customers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Customer Details" userRole="manager" />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Customer Details" userRole="manager" />
        <main className="p-8">
          <div className="text-center text-red-600">{error || 'Customer not found'}</div>
        </main>
      </div>
    );
  }

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'vip':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'corporate':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'registered':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Customer Details" userRole="manager" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/customers"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Customers</span>
        </Link>

        {/* Customer Header */}
        <div className="bg-card rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-200 dark:shadow-none">
                {customer.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground mb-2">
                  {customer.name || 'Walk-in Customer'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getCustomerTypeColor(customer.customerType)}`}>
                    {customer.customerType}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    ID: {customer.customerId}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(customer.totalSpent)}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loyalty Points</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {customer.loyaltyPoints}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchases</span>
            </div>
            <p className="text-2xl font-black text-foreground">
              {customer.purchaseCount}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Purchase</span>
            </div>
            <p className="text-lg font-black text-foreground">
              {customer.lastPurchaseDate 
                ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm mb-8">
          <h2 className="text-xl font-black text-foreground mb-6">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</p>
              {editing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{customer.name || 'Walk-in Customer'}</p>
              )}
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl mt-1">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</p>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">{customer.phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl mt-1">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</p>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {customer.email || 'No email provided'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-4 md:col-span-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl mt-1">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Address</p>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {customer.address || 'No address provided'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {(editing || customer.notes) && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
              {editing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none resize-none"
                />
              ) : (
                <p className="text-foreground/80">{customer.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Purchase History */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
          <h2 className="text-xl font-black text-foreground mb-6">Purchase History</h2>
          
          {purchaseHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-semibold">No purchase history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchaseHistory.map((sale) => (
                <div 
                  key={sale._id}
                  className="p-6 bg-muted/50 rounded-xl border border-border hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {sale.saleNumber}
                      </p>
                      <p className="text-lg font-black text-foreground">
                        {formatCurrency(sale.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        sale.paymentStatus === 'paid' 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
                      <p className="font-semibold text-foreground/80 capitalize">
                        {sale.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cashier</p>
                      <p className="font-semibold text-foreground/80">
                        {sale.cashierId?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items ({sale.items.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {sale.items.slice(0, 3).map((item, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-card rounded-lg text-xs font-semibold text-foreground/80"
                        >
                          {item.productName} x{item.quantity}
                        </span>
                      ))}
                      {sale.items.length > 3 && (
                        <span className="px-3 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                          +{sale.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
