'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from './dashboard-sidebar';
import { UserRole } from '@/lib/rbac';

interface DashboardShellProps {
  userRole: UserRole;
  userName?: string;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, userName, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <div className="print:hidden">
        <DashboardSidebar
          userRole={userRole}
          userName={userName}
          collapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
        />
      </div>
      <div
        className={cn(
          'min-h-screen print:min-h-0 transition-all duration-300 print:ml-0',
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        )}
      >
        {children}
      </div>
    </>
  );
}
