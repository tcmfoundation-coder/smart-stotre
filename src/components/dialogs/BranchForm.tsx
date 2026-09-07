'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from './FormDialog';
import { createBranch, updateBranch } from '@/lib/actions/branches';
import { toast } from 'sonner';

const branchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Branch code is required'),
  address: z.string().min(2, 'Address is required'),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  taxRate: z.string().optional(),
  currency: z.string().optional(),
});

type BranchFormData = z.infer<typeof branchSchema>;

export interface BranchRecord {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  phone: string;
  email?: string;
  settings?: {
    taxRate?: number;
    currency?: string;
  };
}

interface BranchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  branch?: BranchRecord;
  onSuccess?: () => void;
}

export function BranchForm({ open, onOpenChange, mode, branch, onSuccess }: BranchFormProps) {
  const isCreate = mode === 'create';
  const [saving, setSaving] = useState(false);

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      taxRate: '0',
      currency: 'NGN',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: branch?.name || '',
        code: branch?.code || '',
        address: branch?.address || '',
        phone: branch?.phone || '',
        email: branch?.email || '',
        taxRate: String(branch?.settings?.taxRate ?? 0),
        currency: branch?.settings?.currency || 'NGN',
      });
    }
  }, [open, branch, form]);

  const onSubmit = async (data: BranchFormData) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        email: data.email || undefined,
        settings: {
          taxRate: data.taxRate ? parseFloat(data.taxRate) : 0,
          currency: data.currency,
        },
      };

      if (isCreate) {
        await createBranch(payload);
        toast.success('Branch created successfully');
      } else if (branch?._id) {
        await updateBranch(branch._id, payload);
        toast.success('Branch updated successfully');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${isCreate ? 'Deploy New' : 'Configure'} Node`}
      isLoading={saving}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isCreate ? 'Create Branch' : 'Save Changes'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Branch Name *</Label>
            <Input id="name" {...form.register('name')} placeholder="e.g., Lagos Main Store" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Branch Code *</Label>
            <Input id="code" {...form.register('code')} placeholder="e.g., LOS-01" />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Input id="address" {...form.register('address')} placeholder="Street address" />
          {form.formState.errors.address && (
            <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" {...form.register('phone')} placeholder="+234 800 000 0000" />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} placeholder="branch@store.com" />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input id="taxRate" type="number" min="0" step="0.01" {...form.register('taxRate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" {...form.register('currency')} placeholder="NGN" />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
