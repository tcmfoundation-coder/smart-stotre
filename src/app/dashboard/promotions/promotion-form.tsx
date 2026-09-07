'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Percent } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import {
  Promotion,
  usePromotion,
  useCreatePromotion,
  useUpdatePromotion,
} from '@/hooks/usePromotions';

interface PromotionFormProps {
  mode: 'create' | 'edit';
  promotionId?: string;
}

interface FormState {
  name: string;
  description: string;
  type: Promotion['type'];
  value: string;
  startDate: string;
  endDate: string;
  minPurchase: string;
  maxDiscount: string;
  usageLimit: string;
  categoryIds: string[];
  productIds: string[];
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  type: 'percentage',
  value: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  categoryIds: [],
  productIds: [],
};

export default function PromotionForm({ mode, promotionId }: PromotionFormProps) {
  const router = useRouter();
  const { data: existing, isLoading: loadingExisting } = usePromotion(promotionId || '');
  const { data: categories } = useCategories();
  const { data: products } = useProducts();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const initializedFromExisting = useRef(false);

  useEffect(() => {
    if (mode === 'edit' && existing && !initializedFromExisting.current) {
      initializedFromExisting.current = true;
      setForm({
        name: existing.name,
        description: existing.description || '',
        type: existing.type,
        value: String(existing.value),
        startDate: existing.startDate ? existing.startDate.slice(0, 10) : '',
        endDate: existing.endDate ? existing.endDate.slice(0, 10) : '',
        minPurchase: existing.minPurchase !== undefined ? String(existing.minPurchase) : '',
        maxDiscount: existing.maxDiscount !== undefined ? String(existing.maxDiscount) : '',
        usageLimit: existing.usageLimit !== undefined ? String(existing.usageLimit) : '',
        categoryIds: existing.categoryIds || [],
        productIds: existing.productIds || [],
      });
    }
  }, [mode, existing]);

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      value: parseFloat(form.value),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : undefined,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
      categoryIds: form.categoryIds,
      productIds: form.productIds,
    };

    if (mode === 'create') {
      await createPromotion.mutateAsync(payload);
    } else if (promotionId) {
      await updatePromotion.mutateAsync({ id: promotionId, data: payload });
    }
    router.push('/dashboard/promotions');
  };

  const saving = createPromotion.isPending || updatePromotion.isPending;

  if (mode === 'edit' && loadingExisting) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="Edit Promotion" userRole="admin" />
        <main className="p-8 max-w-4xl mx-auto text-muted-foreground">Loading promotion...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title={mode === 'create' ? 'Create Promotion' : 'Edit Promotion'} userRole="admin" />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-[2.5rem] shadow-lg border border-border p-10">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-primary rounded-full" />
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Promotion Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Discount Type *
                    </label>
                    <select
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as Promotion['type'] })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-semibold outline-none appearance-none"
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="fixed">Fixed Amount Off</option>
                      <option value="buy-one-get-one">Buy One Get One</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      {form.type === 'percentage' ? 'Percentage (%) *' : form.type === 'fixed' ? 'Amount Off *' : '2nd Item Discount (%) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-black outline-none text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-emerald-500 rounded-full" />
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Rules</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Min. Purchase (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minPurchase}
                      onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Max Discount (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.usageLimit}
                      onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                      className="w-full px-5 py-4 bg-secondary/50 border-none rounded-2xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all text-foreground font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-8 w-1.5 bg-orange-500 rounded-full" />
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Applies To</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Leave everything unchecked to apply this promotion to all products.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Categories
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-2xl bg-secondary/50 p-3 space-y-1">
                      {categories?.map((cat) => (
                        <label key={cat._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background/60 cursor-pointer text-sm font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={form.categoryIds.includes(cat._id)}
                            onChange={() => setForm({ ...form, categoryIds: toggleId(form.categoryIds, cat._id) })}
                          />
                          {cat.name}
                        </label>
                      ))}
                      {!categories?.length && <p className="text-sm text-muted-foreground px-2 py-1.5">No categories yet.</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Products
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-2xl bg-secondary/50 p-3 space-y-1">
                      {products?.map((p) => (
                        <label key={p._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background/60 cursor-pointer text-sm font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={form.productIds.includes(p._id)}
                            onChange={() => setForm({ ...form, productIds: toggleId(form.productIds, p._id) })}
                          />
                          {p.name}
                        </label>
                      ))}
                      {!products?.length && <p className="text-sm text-muted-foreground px-2 py-1.5">No products yet.</p>}
                    </div>
                  </div>
                </div>
              </div>

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
                  disabled={saving}
                  className="w-full md:w-auto px-12 py-5 bg-primary text-primary-foreground rounded-[1.5rem] font-black shadow-xl shadow-primary/20 hover:bg-primary/90 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-6 w-6 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Percent className="h-6 w-6" />
                      <span>{mode === 'create' ? 'CREATE PROMOTION' : 'SAVE CHANGES'}</span>
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
