'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEATURES = [
  { icon: BarChart3, label: 'Real-time sales & inventory across every branch' },
  { icon: Zap, label: 'AI-assisted demand and restock predictions' },
  { icon: ShieldCheck, label: 'Role-based access with audit-logged activity' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpCode: needsTotp ? totpCode : undefined,
        redirect: false,
      });

      if (result?.code === 'totp_required') {
        setNeedsTotp(true);
        setError('');
      } else if (result?.code === 'totp_invalid') {
        setError('Invalid two-factor code. You can also use a recovery code.');
      } else if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ---------- Branding panel (desktop only) ---------- */}
      <div className="relative hidden overflow-hidden bg-primary-950 lg:flex lg:w-[44%]">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white xl:p-16">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
            <span className="text-lg font-semibold">SmartMart Pro</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Run your store with an edge.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/70">
              One system for point of sale, inventory, and financial reporting —
              built for teams that need to see what&apos;s happening right now.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white/90">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Form panel ---------- */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo - shown only when the branding panel is hidden */}
          <div className="mb-8 text-center lg:hidden">
            <Image src="/logo.svg" alt="" width={48} height={48} className="mx-auto mb-4 h-12 w-12" />
            <h1 className="text-xl font-semibold text-foreground">SmartMart Pro</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={needsTotp}
                placeholder="you@smartmart.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={needsTotp}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {needsTotp && (
              <div className="space-y-1.5">
                <Label htmlFor="totpCode">Two-factor code</Label>
                <Input
                  id="totpCode"
                  type="text"
                  inputMode="text"
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  placeholder="6-digit code or recovery code"
                  className="text-center tracking-[0.2em]"
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
              {loading ? 'Signing in...' : needsTotp ? 'Verify & sign in' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
