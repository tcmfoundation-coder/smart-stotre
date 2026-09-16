'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { createSupplier } from '@/lib/actions/suppliers';
import { ArrowLeft, Save, Truck, Phone, Building2, FileText, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createSupplier(formData);
      router.push('/dashboard/suppliers');
    } catch (err) {
      console.error('Error creating supplier:', err);
      setError('Failed to create supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Add New Supplier" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/dashboard/suppliers"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>

        {/* Form Container */}
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">New Supplier</h1>
                  <p className="text-sm text-muted-foreground">Add a new supplier to your supply chain</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    Basic Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sup-name">Contact Name *</Label>
                      <Input id="sup-name" type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sup-company">Company Name</Label>
                      <Input id="sup-company" type="text" name="company" value={formData.company} onChange={handleChange} placeholder="ABC Supplies Ltd" />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sup-phone">Phone Number *</Label>
                      <Input id="sup-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 8900" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sup-email">Email Address</Label>
                      <Input id="sup-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="supplier@example.com" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="sup-address">Address</Label>
                      <Input id="sup-address" type="text" name="address" value={formData.address} onChange={handleChange} placeholder="123 Business Street, City, Country" />
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Payment Terms
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="sup-terms">Payment Terms</Label>
                    <Input id="sup-terms" type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} placeholder="Net 30, Net 60, etc." />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Additional Notes
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="sup-notes">Notes</Label>
                    <Textarea id="sup-notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} placeholder="Any additional information about this supplier..." />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/suppliers">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={loading} isLoading={loading} className="gap-2">
                    {!loading && (
                      <>
                        <Save className="h-4 w-4" />
                        Create Supplier
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
