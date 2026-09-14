import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { FloatingActionButton } from '@/components/floating-action-button';
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
      <div className="print:hidden">
        <DashboardSidebar userRole={userRole} userName={session.user.name || undefined} />
      </div>
      <div className="min-h-screen print:min-h-0 transition-all duration-300 lg:ml-72 print:ml-0">
        <PageTransition>
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 print:max-w-none print:p-0">
            {children}
          </div>
        </PageTransition>
      </div>
      <div className="print:hidden">
        <FloatingActionButton />
      </div>
    </div>
  );
}
