'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthSuccess } from '@/components/auth/AuthSuccess';

const FEATURES = [
  { icon: BarChart3, label: 'Real-time sales & inventory across every branch' },
  { icon: Zap, label: 'AI-assisted demand and restock predictions' },
  { icon: ShieldCheck, label: 'Role-based access with audit-logged activity' },
];

// next-auth/react's signIn() serializes its options with URLSearchParams,
// which does NOT omit a key whose value is `undefined` - it stringifies it
// to the literal text "undefined" (see node_modules/next-auth/react.js:
// `body: new URLSearchParams({ ...signInParams, csrfToken, callbackUrl })`).
// A prior version of this file passed `totpCode: needsTotp ? totpCode :
// undefined`, so on the very first submit (before needsTotp is ever true)
// the server received credentials.totpCode === "undefined" - a truthy,
// non-empty string - so authorize()'s `if (!totpCode) throw
// TwoFactorRequiredError()` never fired. It went straight to verifying
// "undefined" as a real TOTP/recovery code, which fails, throwing
// InvalidTotpError on the very first attempt. The client then showed
// "Invalid two-factor code" without ever having set needsTotp, so the code
// input never rendered - a 2FA-enabled account could never log in at all.
// The fix is to omit the key entirely (not pass it as `undefined`) until
// there is a real code to send.
export function buildSignInCredentials(
  email: string,
  password: string,
  needsTotp: boolean,
  totpCode: string
): { email: string; password: string; totpCode?: string } {
  return {
    email,
    password,
    ...(needsTotp ? { totpCode } : {}),
  };
}

// The User model has a single `name` field, not separate first/last names -
// this is a display-only transform, not a schema change.
export function getDisplayFirstName(name: string | null | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

// Text only - never a different redirect destination. There's no existing
// role-specific dashboard route to preserve (everyone lands on /dashboard
// today), so the destination stays exactly as it already was; this only
// varies the supporting copy, using the role the session already carries.
export function getRoleAwareMessage(role: string | null | undefined): string {
  if (role === 'admin') return "You're being redirected to your dashboard for managing your business.";
  if (role === 'cashier') return "You're being redirected to your checkout workspace.";
  return "You're being redirected to your dashboard.";
}

interface SignInResultLike {
  error?: string | null;
  code?: string | null;
}

interface SessionLike {
  user?: {
    id?: string;
    name?: string | null;
    role?: string | null;
  };
}

// The gate for the success animation. It must never fire merely because
// signIn() resolved without throwing - a CredentialsSignin error surfaces
// as a resolved result with `error`/`code` set, not a rejection, so that
// alone has to be checked. More importantly, this independently re-reads
// the actual session (via next-auth's own getSession(), a real request to
// its session endpoint) rather than trusting the signIn() response shape,
// and only returns a user when that session genuinely has an id - i.e. the
// server actually established a session, not just "the client thinks it
// did". Returns null for every other case, including a plausible-looking
// but empty session.
export function resolveAuthenticatedUser(
  signInResult: SignInResultLike | null | undefined,
  session: SessionLike | null | undefined
): { name: string; role: string | null } | null {
  if (!signInResult || signInResult.error || signInResult.code) return null;
  if (!session?.user?.id) return null;
  return {
    name: getDisplayFirstName(session.user.name),
    role: session.user.role ?? null,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successUser, setSuccessUser] = useState<{ name: string; role: string | null } | null>(null);

  const resetToCredentials = () => {
    setNeedsTotp(false);
    setUseRecoveryCode(false);
    setTotpCode('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        ...buildSignInCredentials(email, password, needsTotp, totpCode),
        redirect: false,
      });

      if (result?.code === 'totp_required') {
        setNeedsTotp(true);
        setError('');
      } else if (result?.code === 'totp_invalid') {
        setError(useRecoveryCode ? 'Invalid recovery code.' : 'Invalid two-factor code.');
        setTotpCode('');
      } else if (result?.code === 'rate_limited') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (result?.error) {
        setError('Invalid email or password');
      } else {
        // signIn() resolving without error/code means the server already
        // set the session cookie in that same response - but the success
        // screen still confirms it independently via getSession() rather
        // than trusting that shape alone (see resolveAuthenticatedUser).
        const session = await getSession();
        const authenticatedUser = resolveAuthenticatedUser(result, session);
        if (authenticatedUser) {
          setSuccessUser(authenticatedUser);
        } else {
          // The session mechanism didn't confirm a real session despite
          // signIn() reporting success - don't fake a celebration for it,
          // just proceed with the existing plain redirect.
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successUser) {
    return (
      <AuthSuccess
        name={successUser.name}
        message={getRoleAwareMessage(successUser.role)}
        onDone={() => {
          router.push('/dashboard');
          router.refresh();
        }}
      />
    );
  }

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="totpCode">{useRecoveryCode ? 'Recovery code' : 'Authenticator code'}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setTotpCode('');
                      setError('');
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {useRecoveryCode ? 'Use authenticator code instead' : 'Use a recovery code instead'}
                  </button>
                </div>
                <Input
                  id="totpCode"
                  type="text"
                  inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  maxLength={useRecoveryCode ? 11 : 6}
                  placeholder={useRecoveryCode ? 'XXXXX-XXXXX' : '6-digit code'}
                  className="text-center tracking-[0.2em]"
                />
                <p className="text-xs text-muted-foreground">
                  {useRecoveryCode
                    ? 'Enter one of the recovery codes you saved when you set up two-factor authentication. Each one can only be used once.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
              {loading ? 'Signing in...' : needsTotp ? 'Verify & sign in' : 'Sign in'}
            </Button>

            {needsTotp && (
              <button
                type="button"
                onClick={resetToCredentials}
                className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                &larr; Use a different account
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
