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
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Profile" userRole={role} />

      <main className="py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/20">
                  {initial}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{name}</h2>
                  <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                    {role}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-8 space-y-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Account Details</h3>

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
