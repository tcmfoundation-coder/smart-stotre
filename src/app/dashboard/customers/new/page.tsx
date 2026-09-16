'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus } from 'lucide-react';
import { createCustomer } from '@/lib/actions/customers';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    loyaltyPoints: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createCustomer(formData);
      toast.success('Customer created successfully');
      router.push('/dashboard/customers');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Add New Customer" userRole="manager" />

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="mb-4 text-base font-semibold text-foreground">Customer Information</h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cust-name">Full Name *</Label>
                      <Input
                        id="cust-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-phone">Phone Number *</Label>
                      <Input
                        id="cust-phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234 800 123 4567"
                      />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="cust-email">Email Address</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="mb-4 text-base font-semibold text-foreground">Address</h3>
                  <div className="space-y-2">
                    <Label htmlFor="cust-address">Street Address</Label>
                    <Input
                      id="cust-address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street, Lagos"
                    />
                  </div>
                </div>

                {/* Loyalty */}
                <div>
                  <h3 className="mb-4 text-base font-semibold text-foreground">Loyalty Program</h3>
                  <div className="space-y-2">
                    <Label htmlFor="cust-loyalty">Initial Loyalty Points</Label>
                    <Input
                      id="cust-loyalty"
                      type="number"
                      min="0"
                      value={formData.loyaltyPoints}
                      onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">Starting loyalty points for new customer</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center justify-end gap-3 border-t border-border pt-6 sm:flex-row">
                  <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} isLoading={loading} className="w-full gap-2 sm:w-auto">
                    {!loading && (
                      <>
                        <Plus className="h-4 w-4" />
                        Save Customer
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
