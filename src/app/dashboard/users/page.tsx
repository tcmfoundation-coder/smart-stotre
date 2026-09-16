'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { UserCheck, Search, Plus, Edit, Trash2, Mail, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useUsers, useDeleteUser, type User } from '@/hooks/useUsers';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { UserForm } from '@/components/dialogs/UserForm';

const ROLE_BADGE: Record<string, 'default' | 'info' | 'success' | 'secondary'> = {
  admin: 'default',
  manager: 'info',
  cashier: 'success',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const { data: users, isLoading, error, refetch } = useUsers({
    search: searchQuery,
    role: roleFilter,
    status: statusFilter,
  });

  const deleteUser = useDeleteUser();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate(id);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedUser(undefined);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="User Accounts" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative sm:w-64 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full gap-2 xl:w-auto" onClick={handleAddUser}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load users" onRetry={() => refetch()} />
          ) : !users || users.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No users found"
              description={searchQuery ? 'Try a different search term' : 'Add your first user to get started'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <Card key={user._id}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">{user.name}</span>
                        </div>
                        <div className="mb-1 flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{user.email ?? 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{user.branch ?? 'Not assigned'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <Badge variant={ROLE_BADGE[user.role] ?? 'secondary'} className="capitalize">
                        {user.role ?? 'user'}
                      </Badge>
                      <Badge variant={user.status === 'active' ? 'success' : 'destructive'} className="capitalize">
                        {user.status ?? 'active'}
                      </Badge>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Last Login</span>
                        <span className="text-foreground">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US') : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditUser(user)}>
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(user._id)}
                        disabled={deleteUser.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </main>

      <UserForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        mode={formMode}
        user={selectedUser}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
