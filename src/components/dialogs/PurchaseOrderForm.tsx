'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from './FormDialog';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { Plus, Trash2 } from 'lucide-react';

const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  total: z.number().min(0, 'Total must be positive'),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PurchaseOrderForm({ open, onOpenChange, onSuccess }: PurchaseOrderFormProps) {
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const createOrder = useCreatePurchaseOrder();

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: '',
      supplierName: '',
      expectedDelivery: '',
      notes: '',
      items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const calculateTotal = (quantity: number, unitPrice: number) => quantity * unitPrice;

  const handleProductChange = (index: number, productId: string) => {
    const product = products?.find((p) => p._id === productId);
    if (product) {
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.unitPrice`, product.buyingPrice || 0);
      const quantity = form.watch(`items.${index}.quantity`);
      form.setValue(`items.${index}.total`, calculateTotal(quantity, product.buyingPrice || 0));
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const unitPrice = form.watch(`items.${index}.unitPrice`);
    form.setValue(`items.${index}.total`, calculateTotal(quantity, unitPrice));
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const quantity = form.watch(`items.${index}.quantity`);
    form.setValue(`items.${index}.total`, calculateTotal(quantity, unitPrice));
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    try {
      const totalAmount = data.items.reduce((sum, item) => sum + item.total, 0);
      const orderNumber = `PO-${Date.now()}`;
      
      await createOrder.mutateAsync({
        ...data,
        orderNumber,
        totalAmount,
      });
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
      title="New Purchase Order"
      isLoading={createOrder.isPending}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Create Order"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier *</Label>
          <Select
            value={form.watch('supplierId')}
            onValueChange={(value) => {
              const supplier = suppliers?.find((s: any) => s._id === value);
              form.setValue('supplierId', value);
              form.setValue('supplierName', supplier?.name || '');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers?.map((supplier: any) => (
                <SelectItem key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.supplierId && (
            <p className="text-sm text-destructive">{form.formState.errors.supplierId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
          <Input
            id="expectedDelivery"
            type="date"
            {...form.register('expectedDelivery')}
          />
        </div>

        <div className="space-y-2">
          <Label>Items *</Label>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select
                    value={form.watch(`items.${index}.productId`)}
                    onValueChange={(value) => handleProductChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - ${product.buyingPrice || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      onChange={(e) => handleUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">${form.watch(`items.${index}.total`).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: '', productName: '', quantity: 1, unitPrice: 0, total: 0 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            {...form.register('notes')}
            placeholder="Additional notes for this order..."
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </FormDialog>
  );
}
