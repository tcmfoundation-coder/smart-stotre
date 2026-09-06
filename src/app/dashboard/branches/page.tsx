'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getBranches, deleteBranch } from '@/lib/actions/branches';
import { Plus, MapPin, Phone, Mail, Settings, Edit, Trash2, Globe } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Node Management" userRole="admin" />

      <main className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Regional Network</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Orchestrate multiple storefronts and supply nodes.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            <Plus className="h-5 w-5" />
            <span>DEPLOY NEW NODE</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
          {branches.map((branch: Branch) => (
            <div key={branch._id} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Globe className="h-7 w-7" />
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      disabled={deletingId === branch._id}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all disabled:opacity-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{branch.name}</h3>
                  <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg mt-2 border border-slate-200 dark:border-slate-700">
                    Identifier: {branch.code}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    <MapPin className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Phone className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                  {branch.email && (
                    <div className="flex items-center space-x-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <Mail className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-1">Fiscal Rate</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{branch.settings?.taxRate || 0}%</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mb-1">Currency</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{branch.settings?.currency || 'NGN'}</p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] ${branch.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${branch.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span>{branch.isActive ? 'Operational' : 'Offline'}</span>
                </span>
                <button
                  onClick={() => handleEdit(branch)}
                  className="flex items-center space-x-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 uppercase tracking-widest"
                >
                  <Settings className="h-4 w-4" />
                  <span>Configure Node</span>
                </button>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <MapPin className="h-16 w-16 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Isolated Environment</h3>
              <p className="text-slate-400 font-medium mt-2">No operational nodes detected in your regional network.</p>
              <button
                onClick={handleCreate}
                className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 uppercase tracking-widest text-sm"
              >
                Initialize First Node
              </button>
            </div>
          )}
        </div>
        )}
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
