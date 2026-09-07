'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from './FormDialog';
import { useCreateStockAdjustment } from '@/hooks/useStockAdjustments';
import { useProducts } from '@/hooks/useProducts';

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  adjustmentType: z.enum(['increase', 'decrease']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;

interface StockAdjustmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StockAdjustmentForm({ open, onOpenChange, onSuccess }: StockAdjustmentFormProps) {
  const { data: products } = useProducts();
  const createAdjustment = useCreateStockAdjustment();

  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: '',
      adjustmentType: 'increase',
      quantity: 1,
      reason: '',
    },
  });

  const onSubmit = async (data: StockAdjustmentFormData) => {
    try {
      await createAdjustment.mutateAsync(data);
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Stock Adjustment"
      isLoading={createAdjustment.isPending}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create Adjustment"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="productId">Product *</Label>
          <Select
            value={form.watch('productId')}
            onValueChange={(value) => form.setValue('productId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products?.map((product) => (
                <SelectItem key={product._id} value={product._id}>
                  {product.name} (Stock: {product.stockQuantity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.productId && (
            <p className="text-sm text-destructive">{form.formState.errors.productId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustmentType">Adjustment Type *</Label>
          <Select
            value={form.watch('adjustmentType')}
            onValueChange={(value) => form.setValue('adjustmentType', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="increase">Increase Stock</SelectItem>
              <SelectItem value="decrease">Decrease Stock</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.adjustmentType && (
            <p className="text-sm text-destructive">{form.formState.errors.adjustmentType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            {...form.register('quantity', { valueAsNumber: true })}
            placeholder="Enter quantity"
          />
          {form.formState.errors.quantity && (
            <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason *</Label>
          <textarea
            id="reason"
            {...form.register('reason')}
            placeholder="e.g., Damaged goods, Restock, Theft, etc."
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {form.formState.errors.reason && (
            <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
