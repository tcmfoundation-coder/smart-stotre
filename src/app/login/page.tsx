'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, AlertCircle, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 flex">
      {/* ---------- Branding panel (desktop only) ---------- */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-24 -left-24 w-[26rem] h-[26rem] bg-primary-400/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[24rem] h-[24rem] bg-primary-500/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full text-white">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-11 w-11 flex-shrink-0">
              <img src="/logo.svg" alt="SmartMart" className="h-full w-full" />
            </div>
            <span className="text-lg font-black uppercase tracking-[0.2em]">SmartMart Pro</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-md"
          >
            <h1 className="text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight">
              Run your store with an edge.
            </h1>
            <p className="text-white/70 font-medium mt-5 text-base leading-relaxed">
              One system for point of sale, inventory, and financial reporting —
              built for teams that need to see what's happening right now.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3">
                <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-white/90">{feature.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ---------- Form panel ---------- */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle decoration for mobile/no-branding-panel viewports */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full opacity-10 dark:opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-700 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full relative z-10"
        >
          {/* Logo - shown only when the branding panel is hidden */}
          <div className="lg:hidden text-center mb-8">
            <div className="h-14 w-14 mx-auto mb-4">
              <img src="/logo.svg" alt="SmartMart" className="h-full w-full" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">SmartMart Pro</h1>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-black text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground font-medium mt-1 text-sm">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-4 rounded-2xl text-sm font-bold flex items-center space-x-3"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="email" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={needsTotp}
                className="w-full px-5 py-4 bg-secondary/50 border border-transparent rounded-2xl focus:ring-2 focus:ring-ring/20 focus:border-ring focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground disabled:opacity-60"
                placeholder="you@smartmart.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={needsTotp}
                  className="w-full px-5 py-4 bg-secondary/50 border border-transparent rounded-2xl focus:ring-2 focus:ring-ring/20 focus:border-ring focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground disabled:opacity-60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {needsTotp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label htmlFor="totpCode" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                    Two-Factor Code
                  </label>
                  <input
                    id="totpCode"
                    type="text"
                    inputMode="text"
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-secondary/50 border border-transparent rounded-2xl focus:ring-2 focus:ring-ring/20 focus:border-ring focus:bg-background transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground text-center tracking-[0.3em]"
                    placeholder="6-digit code or recovery code"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center space-x-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 border-[3px] border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>{needsTotp ? 'Verify & Sign In' : 'Sign In'}</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
