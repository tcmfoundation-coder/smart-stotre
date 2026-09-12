'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'loading' | 'disabled' | 'setup' | 'recovery-codes' | 'enabled' | 'disabling';

export function TwoFactorSettings() {
  const [stage, setStage] = useState<Stage>('loading');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/2fa/status');
        const data = await res.json();
        setStage(data?.data?.enabled ? 'enabled' : 'disabled');
      } catch {
        setStage('disabled');
      }
    })();
  }, []);

  const startSetup = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to start 2FA setup');
        return;
      }
      setQrDataUrl(data.data.qrDataUrl);
      setManualSecret(data.data.secret);
      setStage('setup');
    } catch {
      toast.error('Failed to connect to the server');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSetup = async () => {
    if (!verifyCode.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Invalid code');
        return;
      }
      setRecoveryCodes(data.data.recoveryCodes);
      setVerifyCode('');
      setStage('recovery-codes');
    } catch {
      toast.error('Failed to connect to the server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to disable 2FA');
        return;
      }
      toast.success('Two-factor authentication disabled');
      setDisablePassword('');
      setStage('disabled');
    } catch {
      toast.error('Failed to connect to the server');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (stage === 'enabled') {
    return (
      <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Two-Factor Authentication</h4>
              <p className="text-xs font-semibold text-muted-foreground mt-1">Enabled — an authenticator code is required at login.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStage('disabling')}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
          >
            Disable
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'disabling') {
    return (
      <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
        <div className="flex items-center gap-3">
          <ShieldOff className="h-6 w-6 text-rose-600" />
          <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Disable Two-Factor Authentication</h4>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">Enter your password to confirm.</p>
        <div className="flex gap-2 max-w-sm">
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Current password"
            className="flex-1 px-4 py-3 bg-card border-none rounded-xl focus:ring-2 focus:ring-ring/10 text-foreground font-semibold outline-none"
          />
          <button
            type="button"
            onClick={handleDisable}
            disabled={submitting || !disablePassword}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={() => { setStage('enabled'); setDisablePassword(''); }}
            className="px-4 py-2 bg-muted text-foreground/80 rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
        <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Set Up Two-Factor Authentication</h4>
        <p className="text-xs font-semibold text-muted-foreground">
          Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), or enter the code manually.
        </p>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Two-factor setup QR code" className="w-40 h-40 rounded-xl border border-border" />
        )}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manual entry code</p>
          <code className="block px-3 py-2 bg-card rounded-lg text-sm font-mono text-foreground break-all">{manualSecret}</code>
        </div>
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="Enter 6-digit code"
            className="flex-1 px-4 py-3 bg-card border-none rounded-xl focus:ring-2 focus:ring-ring/10 text-foreground font-semibold outline-none text-center tracking-[0.3em]"
          />
          <button
            type="button"
            onClick={confirmSetup}
            disabled={submitting || !verifyCode.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'recovery-codes') {
    return (
      <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Two-Factor Authentication Enabled</h4>
        </div>
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Save these recovery codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app. They will not be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((code) => (
            <code key={code} className="px-3 py-2 bg-card rounded-lg text-foreground text-center">
              {code}
            </code>
          ))}
        </div>
        <button
          type="button"
          onClick={copyRecoveryCodes}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground/80 rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy Codes'}
        </button>
        <button
          type="button"
          onClick={() => setStage('enabled')}
          className="block w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
        >
          I&apos;ve Saved My Recovery Codes
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-muted/30 rounded-2xl border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Two-Factor Authentication</h4>
          <p className="text-xs font-semibold text-muted-foreground mt-1">Require an authenticator app code on dashboard logins.</p>
        </div>
        <button
          type="button"
          onClick={startSetup}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
        </button>
      </div>
    </div>
  );
}
