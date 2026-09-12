'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { createSupplier } from '@/lib/actions/suppliers';
import { ArrowLeft, Save, Truck, Phone, Mail, MapPin, Building2, FileText, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Add New Supplier" userRole="admin" />
      
      <main className="p-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/suppliers"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Back to Suppliers</span>
        </Link>

        {/* Form Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">New Supplier</h1>
                <p className="text-sm font-semibold text-muted-foreground">Add a new supplier to your supply chain</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Contact Name *
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
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="ABC Supplies Ltd"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-600" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="supplier@example.com"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Business Street, City, Country"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                  Payment Terms
                </h2>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    placeholder="Net 30, Net 60, etc."
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <h2 className="text-lg font-black text-foreground mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Additional Notes
                </h2>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Any additional information about this supplier..."
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
                <Link
                  href="/dashboard/suppliers"
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
                  <span>{loading ? 'Creating...' : 'Create Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
