'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getBranches, deleteBranch } from '@/lib/actions/branches';
import { Plus, MapPin, Phone, Mail, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BranchForm, type BranchRecord } from '@/components/dialogs/BranchForm';
import { toast } from 'sonner';

interface Branch extends BranchRecord {
  location?: string;
  status?: string;
  isActive?: boolean;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await getBranches();
      setBranches(data);
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadBranches();
    })();
  }, []);

  const handleCreate = () => {
    setFormMode('create');
    setEditingBranch(undefined);
    setFormOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setFormMode('edit');
    setEditingBranch(branch);
    setFormOpen(true);
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Are you sure you want to deactivate "${branch.name}"?`)) {
      return;
    }
    setDeletingId(branch._id);
    try {
      await deleteBranch(branch._id);
      toast.success('Branch deactivated successfully');
      await loadBranches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate branch');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Node Management" userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Regional Network</h2>
            <p className="mt-1 text-sm text-muted-foreground">Orchestrate multiple storefronts and supply nodes.</p>
          </div>
          <Button className="w-full gap-2 sm:w-auto" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Deploy New Node
          </Button>
        </div>

        <ErrorBoundary>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : branches.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Isolated Environment"
              description="No operational nodes detected in your regional network."
              actionLabel="Initialize First Node"
              onAction={handleCreate}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch: Branch) => (
                <Card key={branch._id}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleEdit(branch)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(branch)}
                          disabled={deletingId === branch._id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-foreground">{branch.name}</h3>
                      <Badge variant="secondary" className="mt-1.5">Identifier: {branch.code}</Badge>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                        <span>{branch.address}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                        <span>{branch.phone}</span>
                      </div>
                      {branch.email && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                          <span>{branch.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
                      <div className="rounded-md bg-muted/50 p-3 text-center">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Fiscal Rate</p>
                        <p className="text-sm font-semibold text-foreground">{branch.settings?.taxRate || 0}%</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3 text-center">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Currency</p>
                        <p className="text-sm font-semibold text-foreground">{branch.settings?.currency || 'NGN'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <Badge variant={branch.isActive ? 'success' : 'secondary'}>
                        {branch.isActive ? 'Operational' : 'Offline'}
                      </Badge>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => handleEdit(branch)}>
                        Configure Node
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </main>

      <BranchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        branch={editingBranch}
        onSuccess={loadBranches}
      />
    </div>
  );
}
