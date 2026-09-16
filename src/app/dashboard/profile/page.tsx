'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Profile" userRole={role} />

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                  {initial}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{name}</h2>
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                    {role}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 p-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Account Details</h3>

              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-medium">{email || 'No email on file'}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-medium capitalize">{role} access level</span>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => router.push('/dashboard/settings?tab=security')}
                >
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
