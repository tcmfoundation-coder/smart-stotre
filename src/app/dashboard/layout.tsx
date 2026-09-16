import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { PageTransition } from '@/components/page-transition';
import { ActivityTracker } from '@/components/activity-tracker';
import { UserRole } from '@/lib/rbac';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const userRole = (session.user.role as UserRole) || 'cashier';

  return (
    <div className="min-h-screen print:min-h-0 bg-background transition-colors duration-300 overflow-x-hidden print:overflow-visible">
      <ActivityTracker />
      <DashboardShell userRole={userRole} userName={session.user.name || undefined}>
        <PageTransition>
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 print:max-w-none print:p-0">
            {children}
          </div>
        </PageTransition>
      </DashboardShell>
    </div>
  );
}
