'use client';

import { useState } from 'react';
import { toast } from 'sonner';

// Backups are generated on demand and streamed straight to the browser as a
// download - nothing is stored server-side, so there is no history list to
// fetch (see the "Backup & Restore" section of SMART_STORE_AUDIT.md for why).
export function useExportBackup() {
  const [isExporting, setIsExporting] = useState(false);

  const exportBackup = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/backup/export');
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to generate backup export');
      }

      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `smart-store-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Backup export downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate backup export');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportBackup, isExporting };
}
