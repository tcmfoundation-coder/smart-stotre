'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { Plus } from 'lucide-react';
import { createCustomer } from '@/lib/actions/customers';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Add New Customer" userRole="manager" />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-[2.5rem] shadow-lg border border-border p-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Basic Information */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-primary rounded-full"></div>
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Customer Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 800 123 4567"
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Address</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, Lagos"
                    className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Loyalty */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-orange-500 rounded-full"></div>
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Loyalty Program</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                    Initial Loyalty Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.loyaltyPoints}
                    onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                    className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-black outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Starting loyalty points for new customer</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-10 border-t border-border flex flex-col md:flex-row items-center justify-end space-y-4 md:space-y-0 md:space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full md:w-auto px-10 py-4 text-muted-foreground font-black hover:text-foreground transition-colors uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-12 py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black shadow-xl shadow-primary/20 hover:bg-primary/90 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  {loading ? (
                    <div className="h-6 w-6 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-6 w-6" />
                      <span>SAVE CUSTOMER</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
