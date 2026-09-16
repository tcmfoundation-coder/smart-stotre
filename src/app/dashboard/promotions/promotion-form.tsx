'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Edit Promotion" userRole="admin" />
        <main className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground lg:p-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading promotion...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title={mode === 'create' ? 'Create Promotion' : 'Edit Promotion'} userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-base font-semibold text-foreground">Promotion Details</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="promo-name">Name *</Label>
                    <Input
                      id="promo-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="promo-description">Description</Label>
                    <Textarea
                      id="promo-description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-type">Discount Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Promotion['type'] })}>
                      <SelectTrigger id="promo-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage Off</SelectItem>
                        <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                        <SelectItem value="buy-one-get-one">Buy One Get One</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-value">
                      {form.type === 'percentage' ? 'Percentage (%) *' : form.type === 'fixed' ? 'Amount Off *' : '2nd Item Discount (%) *'}
                    </Label>
                    <Input
                      id="promo-value"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-start">Start Date *</Label>
                    <Input
                      id="promo-start"
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-end">End Date</Label>
                    <Input
                      id="promo-end"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-base font-semibold text-foreground">Rules</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="promo-min">Min. Purchase (₦)</Label>
                    <Input
                      id="promo-min"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minPurchase}
                      onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-max">Max Discount (₦)</Label>
                    <Input
                      id="promo-max"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-usage">Usage Limit</Label>
                    <Input
                      id="promo-usage"
                      type="number"
                      min="0"
                      value={form.usageLimit}
                      onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Applies To</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Leave everything unchecked to apply this promotion to all products.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-3">
                      {categories?.map((cat) => (
                        <label key={cat._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={form.categoryIds.includes(cat._id)}
                            onChange={() => setForm({ ...form, categoryIds: toggleId(form.categoryIds, cat._id) })}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          {cat.name}
                        </label>
                      ))}
                      {!categories?.length && <p className="px-2 py-1.5 text-sm text-muted-foreground">No categories yet.</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Products</Label>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-3">
                      {products?.map((p) => (
                        <label key={p._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={form.productIds.includes(p._id)}
                            onChange={() => setForm({ ...form, productIds: toggleId(form.productIds, p._id) })}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          {p.name}
                        </label>
                      ))}
                      {!products?.length && <p className="px-2 py-1.5 text-sm text-muted-foreground">No products yet.</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col items-center justify-end gap-3 border-t border-border pt-6 sm:flex-row">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={saving} isLoading={saving}>
                {!saving && (mode === 'create' ? 'Create Promotion' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
