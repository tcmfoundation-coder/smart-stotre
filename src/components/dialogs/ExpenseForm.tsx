'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from './FormDialog';
import { createExpense, updateExpense } from '@/lib/actions/expenses';
import { toast } from 'sonner';

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  transport: 'Transport',
  salary: 'Staff Salaries',
  supplier_payment: 'Supplier Payment',
  maintenance: 'Maintenance',
  other: 'Other',
};

const expenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['rent', 'electricity', 'transport', 'salary', 'supplier_payment', 'maintenance', 'other']),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Enter a valid amount'),
  date: z.string().min(1, 'Date is required'),
  paidTo: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export interface ExpenseRecord {
  _id: string;
  title: string;
  description?: string;
  category: string;
  amount: number;
  date: string;
  paidTo?: string;
  notes?: string;
}

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  expense?: ExpenseRecord;
  createdById?: string;
  onSuccess?: () => void;
}

export function ExpenseForm({ open, onOpenChange, mode, expense, createdById, onSuccess }: ExpenseFormProps) {
  const isCreate = mode === 'create';
  const [saving, setSaving] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'other',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paidTo: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: expense?.title || '',
        description: expense?.description || '',
        category: (expense?.category as ExpenseFormData['category']) || 'other',
        amount: expense ? String(expense.amount) : '',
        date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paidTo: expense?.paidTo || '',
        notes: expense?.notes || '',
      });
    }
  }, [open, expense, form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        category: data.category,
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        paidTo: data.paidTo || undefined,
        notes: data.notes || undefined,
      };

      if (isCreate) {
        await createExpense({ ...payload, createdBy: createdById });
        toast.success('Expense recorded successfully');
      } else if (expense?._id) {
        await updateExpense(expense._id, payload);
        toast.success('Expense updated successfully');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? 'Add Expense' : 'Edit Expense'}
      isLoading={saving}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isCreate ? 'Add Expense' : 'Save Changes'}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" {...form.register('title')} placeholder="e.g., Office rent - January" />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              {...form.register('category')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" min="0" step="0.01" {...form.register('amount')} />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...form.register('date')} />
            {form.formState.errors.date && (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="paidTo">Paid To</Label>
            <Input id="paidTo" {...form.register('paidTo')} placeholder="Recipient" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            {...form.register('description')}
            rows={2}
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </FormDialog>
  );
}
