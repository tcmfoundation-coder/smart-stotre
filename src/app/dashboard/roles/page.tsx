'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Shield, Search, Plus, Edit, Trash2, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AVAILABLE_PERMISSIONS = [
  { id: 'create_users', label: 'Create Users', category: 'User Management' },
  { id: 'edit_users', label: 'Edit Users', category: 'User Management' },
  { id: 'delete_users', label: 'Delete Users', category: 'User Management' },
  { id: 'assign_roles', label: 'Assign Roles', category: 'User Management' },
  { id: 'create_products', label: 'Create Products', category: 'Inventory' },
  { id: 'edit_products', label: 'Edit Products', category: 'Inventory' },
  { id: 'delete_products', label: 'Delete Products', category: 'Inventory' },
  { id: 'manage_inventory', label: 'Manage Inventory', category: 'Inventory' },
  { id: 'manage_suppliers', label: 'Manage Suppliers', category: 'Inventory' },
  { id: 'manage_customers', label: 'Manage Customers', category: 'Customer Management' },
  { id: 'view_reports', label: 'View Reports', category: 'Reports' },
  { id: 'manage_settings', label: 'Manage Settings', category: 'Settings' },
  { id: 'backup_restore', label: 'Backup & Restore', category: 'Settings' },
  { id: 'view_activity_logs', label: 'View Activity Logs', category: 'Settings' },
  { id: 'approve_stock_adjustments', label: 'Approve Stock Adjustments', category: 'Inventory' },
  { id: 'manage_promotions', label: 'Manage Promotions', category: 'Marketing' },
  { id: 'create_sales', label: 'Create Sales', category: 'Sales' },
  { id: 'process_payments', label: 'Process Payments', category: 'Sales' },
  { id: 'view_products', label: 'View Products', category: 'Inventory' },
  { id: 'process_returns', label: 'Process Returns', category: 'Sales' },
  { id: 'view_own_sales', label: 'View Own Sales', category: 'Sales' },
];

export default function RolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/roles' + (searchQuery ? `?search=${searchQuery}` : ''));
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
    setShowDialog(true);
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
    });
    setShowDialog(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Role deleted successfully');
        fetchRoles();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole._id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingRole ? 'Role updated successfully' : 'Role created successfully');
        setShowDialog(false);
        fetchRoles();
      } else {
        toast.error(data.error || 'Failed to save role');
      }
    } catch (error) {
      toast.error('Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Roles & Permissions" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9"
              aria-label="Search roles"
            />
          </div>
          <Button className="w-full gap-2 sm:w-auto" onClick={handleAddRole} aria-label="Add new role">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Role
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Loading roles">
              {[1, 2, 3, 4].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : !roles || roles.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No roles found"
              description={searchQuery ? 'Try a different search term' : 'Create your first role to get started'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {roles.map((role: any, index: number) => {
                const permissions = role.permissions ?? [];

                return (
                  <Card key={role._id || role.id || index}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span className="font-semibold text-foreground">{role.name}</span>
                            {role.isSystem && <Badge variant="secondary">System</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                      </div>

                      <div className="mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm text-muted-foreground">{role.userCount ?? 0} users assigned</span>
                      </div>

                      <div className="mb-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Permissions ({permissions.length})
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {permissions.slice(0, 6).map((permission: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {AVAILABLE_PERMISSIONS.find((p) => p.id === permission)?.label || permission}
                            </Badge>
                          ))}

                          {permissions.length > 6 && (
                            <Badge variant="outline">+{permissions.length - 6} more</Badge>
                          )}

                          {permissions.length === 0 && (
                            <span className="text-xs italic text-muted-foreground">No permissions assigned</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditRole(role)}
                          aria-label={`Edit ${role.name}`}
                        >
                          <Edit className="mr-1 h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>

                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRole(role._id || role.id)}
                            aria-label={`Delete ${role.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* Add/Edit Role Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Supervisor"
                disabled={editingRole?.isSystem}
                aria-label="Role name"
              />
            </div>

            <div>
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role's purpose..."
                rows={3}
                aria-label="Role description"
              />
            </div>

            <div>
              <Label>Permissions ({formData.permissions.length} selected)</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="mb-2 text-sm font-semibold text-foreground">{category}</h4>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {permissions.map((permission) => {
                        const active = formData.permissions.includes(permission.id);
                        return (
                          <button
                            key={permission.id}
                            type="button"
                            onClick={() => handleTogglePermission(permission.id)}
                            disabled={editingRole?.isSystem}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                              active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-secondary/50',
                              editingRole?.isSystem && 'cursor-not-allowed opacity-50'
                            )}
                            aria-label={`Toggle ${permission.label} permission`}
                            aria-pressed={active}
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium">{permission.label}</span>
                            </div>
                            {active && <Check className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || editingRole?.isSystem} isLoading={isSubmitting}>
              {!isSubmitting && (editingRole ? 'Update Role' : 'Create Role')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
