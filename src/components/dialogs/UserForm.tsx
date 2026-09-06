'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from './FormDialog';
import { useCreateUser, useUpdateUser, type User, type CreateUserInput } from '@/hooks/useUsers';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'cashier']),
  status: z.enum(['active', 'inactive']),
  branch: z.string().optional(),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  user?: User;
  onSuccess?: () => void;
}

export function UserForm({ open, onOpenChange, mode, user, onSuccess }: UserFormProps) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      branch: user.branch,
    } : {
      name: '',
      email: '',
      role: 'cashier',
      status: 'active',
      branch: '',
      password: '',
    },
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const onSubmit = async (data: UserFormData) => {
    if (isCreate) {
      if (!data.password || data.password.length < 6) {
        form.setError('password', { message: 'Password must be at least 6 characters' });
        return;
      }
      await createUser.mutateAsync(data as CreateUserInput);
    } else if (isEdit && user?._id) {
      const updateData = { ...data };
      delete updateData.password;
      await updateUser.mutateAsync({ id: user._id, data: updateData });
    }
    onSuccess?.();
    onOpenChange(false);
    form.reset();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${isCreate ? 'Create' : isEdit ? 'Edit' : 'View'} User`}
      isLoading={createUser.isPending || updateUser.isPending}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isCreate ? 'Create User' : 'Update User'}
      showActions={!isView}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...form.register('name')}
            disabled={isView}
            placeholder="Enter user name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            disabled={isView}
            placeholder="Enter email address"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        {isCreate && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              placeholder="Enter a password (min. 6 characters)"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={form.watch('role')}
            onValueChange={(value) => form.setValue('role', value as any)}
            disabled={isView}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="cashier">Cashier</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.role && (
            <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(value) => form.setValue('status', value as any)}
            disabled={isView}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.status && (
            <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch">Branch (Optional)</Label>
          <Input
            id="branch"
            {...form.register('branch')}
            disabled={isView}
            placeholder="Enter branch name"
          />
        </div>
      </div>
    </FormDialog>
  );
}
