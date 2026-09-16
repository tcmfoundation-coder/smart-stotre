'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stage === 'enabled') {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success" />
            <div>
              <h4 className="text-sm font-medium text-foreground">Two-Factor Authentication</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Enabled — an authenticator code is required at login.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setStage('disabling')} className="text-destructive hover:text-destructive">
            Disable
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'disabling') {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <ShieldOff className="h-5 w-5 text-destructive" />
          <h4 className="text-sm font-medium text-foreground">Disable Two-Factor Authentication</h4>
        </div>
        <p className="text-xs text-muted-foreground">Enter your password to confirm.</p>
        <div className="flex max-w-sm gap-2">
          <Input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Current password"
          />
          <Button type="button" variant="destructive" onClick={handleDisable} disabled={submitting || !disablePassword} isLoading={submitting}>
            {!submitting && 'Confirm'}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setStage('enabled'); setDisablePassword(''); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <h4 className="text-sm font-medium text-foreground">Set Up Two-Factor Authentication</h4>
        <p className="text-xs text-muted-foreground">
          Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), or enter the code manually.
        </p>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Two-factor setup QR code" className="h-40 w-40 rounded-md border border-border" />
        )}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Manual entry code</p>
          <code className="block break-all rounded-md bg-card px-3 py-2 font-mono text-sm text-foreground">{manualSecret}</code>
        </div>
        <div className="flex max-w-sm gap-2">
          <Input
            type="text"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="Enter 6-digit code"
            className="text-center tracking-[0.2em]"
          />
          <Button type="button" onClick={confirmSetup} disabled={submitting || !verifyCode.trim()} isLoading={submitting}>
            {!submitting && 'Verify'}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'recovery-codes') {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success" />
          <h4 className="text-sm font-medium text-foreground">Two-Factor Authentication Enabled</h4>
        </div>
        <p className="text-xs font-medium text-warning">
          Save these recovery codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app. They will not be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((code) => (
            <code key={code} className="rounded-md bg-card px-3 py-2 text-center text-foreground">
              {code}
            </code>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyRecoveryCodes} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy Codes'}
        </Button>
        <Button type="button" onClick={() => setStage('enabled')} className="w-full">
          I&apos;ve Saved My Recovery Codes
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">Two-Factor Authentication</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">Require an authenticator app code on dashboard logins.</p>
        </div>
        <Button type="button" size="sm" onClick={startSetup} disabled={submitting} isLoading={submitting}>
          {!submitting && 'Enable'}
        </Button>
      </div>
    </div>
  );
}
