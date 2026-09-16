'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getCustomerById, getCustomerPurchaseHistory, updateCustomer, deleteCustomer } from '@/lib/actions/customers';
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, Award, Calendar, TrendingUp, Edit, Save, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/ui/kpi-card';

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

const CUSTOMER_TYPE_BADGE: Record<string, 'default' | 'info' | 'success' | 'secondary'> = {
  vip: 'default',
  corporate: 'info',
  registered: 'success',
  'walk-in': 'secondary',
};

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
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Customer Details" userRole="manager" />
        <main className="flex h-64 items-center justify-center p-6 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Customer Details" userRole="manager" />
        <main className="p-6 lg:p-8">
          <div className="text-center text-destructive">{error || 'Customer not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Customer Details" userRole="manager" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/customers"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>

        {/* Customer Header */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {customer.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{customer.name || 'Walk-in Customer'}</h1>
                <div className="mt-1.5 flex items-center gap-3">
                  <Badge variant={CUSTOMER_TYPE_BADGE[customer.customerType] ?? 'secondary'} className="capitalize">
                    {customer.customerType}
                  </Badge>
                  <span className="text-sm text-muted-foreground">ID: {customer.customerId}</span>
                </div>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {!editing ? (
                <>
                  <Button variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={() => setEditing(true)}>
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
          <KPICard title="Total Spent" value={formatCurrency(customer.totalSpent)} icon={TrendingUp} variant="success" />
          <KPICard title="Loyalty Points" value={customer.loyaltyPoints} icon={Award} variant="warning" />
          <KPICard title="Purchases" value={customer.purchaseCount} icon={ShoppingBag} variant="info" />
          <KPICard
            title="Last Purchase"
            value={customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never'}
            icon={Calendar}
            variant="neutral"
          />
        </div>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Contact Information</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cust-detail-name">Name</Label>
                {editing ? (
                  <Input id="cust-detail-name" type="text" value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                ) : (
                  <p className="text-sm font-medium text-foreground">{customer.name || 'Walk-in Customer'}</p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cust-detail-phone">Phone</Label>
                  {editing ? (
                    <Input id="cust-detail-phone" type="tel" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{customer.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cust-detail-email">Email</Label>
                  {editing ? (
                    <Input id="cust-detail-email" type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{customer.email || 'No email provided'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cust-detail-address">Address</Label>
                  {editing ? (
                    <Input id="cust-detail-address" type="text" value={formData.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{customer.address || 'No address provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {(editing || customer.notes) && (
              <div className="mt-6 space-y-2 border-t border-border pt-6">
                <Label htmlFor="cust-detail-notes">Notes</Label>
                {editing ? (
                  <Textarea id="cust-detail-notes" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} rows={3} />
                ) : (
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-6 text-base font-semibold text-foreground">Purchase History</h2>

            {purchaseHistory.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto mb-4 h-10 w-10 opacity-50" />
                <p className="text-sm">No purchase history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseHistory.map((sale) => (
                  <div key={sale._id} className="rounded-md border border-border p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{sale.saleNumber}</p>
                        <p className="mt-0.5 text-base font-semibold text-foreground">{formatCurrency(sale.total)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                        <Badge variant={sale.paymentStatus === 'paid' ? 'success' : 'warning'} className="mt-1 capitalize">
                          {sale.paymentStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Method</p>
                        <p className="font-medium capitalize text-foreground">{sale.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cashier</p>
                        <p className="font-medium text-foreground">{sale.cashierId?.name || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="mb-2 text-xs text-muted-foreground">Items ({sale.items.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {sale.items.slice(0, 3).map((item, index) => (
                          <Badge key={index} variant="secondary">
                            {item.productName} x{item.quantity}
                          </Badge>
                        ))}
                        {sale.items.length > 3 && <Badge variant="outline">+{sale.items.length - 3} more</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
