'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { Database, Download, Info, ShieldAlert, CloudCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExportBackup } from '@/hooks/useBackups';

export default function BackupPage() {
  const { exportBackup, isExporting } = useExportBackup();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Backup & Export" userRole="admin" />

      <main className="space-y-6 p-6 lg:p-8">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Export Full Backup</h3>
                <p className="text-sm text-muted-foreground">
                  Downloads a JSON snapshot of every collection in the live database, generated on demand.
                </p>
              </div>
            </div>
            <Button onClick={exportBackup} disabled={isExporting} isLoading={isExporting} className="gap-2">
              {!isExporting && <Download className="h-4 w-4" />}
              {isExporting ? 'Generating export...' : 'Export Full Backup'}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              The file includes hashed passwords and encrypted two-factor secrets exactly as stored in the
              database (never in plaintext) so it can restore login capability if needed. Treat the downloaded
              file with the same care as direct database access — store it securely and do not share it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-warning" />
              <h3 className="text-base font-semibold text-foreground">Restoring a Backup</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              This page intentionally does not offer a self-service &quot;restore&quot; action. Overwriting the
              live database from an uploaded file is a high-risk, hard-to-reverse operation with no safe way to
              validate the file or undo a mistake from inside the app.
            </p>
            <p className="text-sm text-muted-foreground">
              To restore data, an administrator should do so directly against the database — either through
              MongoDB Atlas&apos;s own point-in-time restore (if Cloud Backups are enabled on the cluster), or
              by running <code className="rounded bg-secondary px-1 py-0.5 text-xs">mongorestore</code> against
              an export file with proper precautions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <CloudCog className="h-5 w-5 text-info" />
              <h3 className="text-base font-semibold text-foreground">Recommended Production Setup</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This app runs as a single service with data stored on MongoDB Atlas and no object storage
                configured — so automatic, scheduled, durably-stored backups aren&apos;t something the
                application itself can safely provide today. The manual export above is a real, on-demand
                snapshot, not a substitute for automated disaster recovery.
              </p>
              <p>
                The recommended path for real automated backups is <strong>MongoDB Atlas Cloud Backups</strong>{' '}
                (available on M10+ cluster tiers) — continuous, point-in-time snapshots managed entirely by
                Atlas, requiring no application code. If the current cluster is on a free/shared tier, enabling
                this requires an Atlas tier upgrade, which is a billing decision for the account owner.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-md border border-info/20 bg-info/10 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" />
          <p className="text-xs text-info">
            Each export is recorded in Activity Logs with the exporting admin&apos;s identity and timestamp,
            since a full database export is a sensitive, high-privilege action.
          </p>
        </div>
      </main>
    </div>
  );
}
