'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Save, Store, Bell, Shield, CreditCard, Globe, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-5">
      <div className="pr-6">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(requestedTab === 'security' ? 'security' : 'general');
  const [settings, setSettings] = useState({
    currency: 'NGN',
    taxRate: 7.5,
    lowStockThreshold: 10,
    expiryWarningDays: 15,
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    expiryAlerts: true,
    paystackPublicKey: '',
    paystackSecretKey: '',
    enableCash: true,
    enableCard: true,
    enableTransfer: true,
    storeName: 'SmartMart Pro',
    storeEmail: 'contact@smartmart.com',
    deliveryCharge: 0,
    whatsappNumber: '',
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { data: session, status } = useSession();
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const canAccessSettings = roleConfig.canAccessSettings;

  // Roles without canAccessSettings never fetch /api/settings (it's
  // admin-only) below, so there's nothing to wait on - skip the loading
  // spinner for them entirely instead of flashing it before an effect
  // clears it a tick later.
  const [loading, setLoading] = useState(canAccessSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const tabs = [
    { id: 'general', name: 'General', icon: Store },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'online', name: 'Online Store', icon: Globe },
  ];

  // Fetch settings from API on mount - /api/settings is admin-only, so
  // skip it entirely for roles that can only ever reach the security tab.
  useEffect(() => {
    if (!canAccessSettings) {
      setLoading(false);
      return;
    }

    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        if (result.success && result.data) {
          setSettings((prev) => ({
            ...prev,
            ...result.data,
          }));
        } else {
          setFeedback({ type: 'error', message: result.error || 'Failed to load settings.' });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setFeedback({ type: 'error', message: 'Failed to connect to the server.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [canAccessSettings]);

  // Non-admins can only ever reach the Security tab (password/2FA) - the
  // other four tabs are real store-configuration and stay admin-only.
  useEffect(() => {
    if (!canAccessSettings && activeTab !== 'security') {
      setActiveTab('security');
    }
  }, [canAccessSettings, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurity((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      let response;
      if (activeTab === 'security') {
        if (!security.currentPassword && !security.newPassword && !security.confirmPassword) {
          throw new Error('Enter your current and new password to update it');
        }
        if (security.newPassword !== security.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (security.newPassword && security.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }

        response = await fetch('/api/settings/security', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: security.currentPassword,
            newPassword: security.newPassword,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to update password');
        }
        setSecurity((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setFeedback({ type: 'success', message: 'Password updated successfully!' });
      } else {
        // Standard settings API call
        response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        });
        const result = await response.json();
        if (result.success) {
          setFeedback({ type: 'success', message: 'Settings updated successfully!' });
        } else {
          throw new Error(result.error || 'Failed to save settings');
        }
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="System Settings" userRole="admin" />
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </main>
      </div>
    );
  }

  if (!canAccessSettings && activeTab !== 'security') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="System Settings" userRole="admin" />
        <main className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-warning/10 text-warning">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Admin Access Required</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Only administrators can view or change system control settings.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="System Settings" userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className={cn('mx-auto flex flex-col gap-6 md:flex-row', canAccessSettings ? 'max-w-6xl' : 'max-w-2xl')}>
          {/* Sidebar Tabs - the other tabs are real store configuration and
              stay admin-only, so non-admins (limited to Security) skip
              straight to the form instead of seeing a one-item switcher. */}
          {canAccessSettings && (
            <aside className="w-full space-y-1 md:w-56">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFeedback(null);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </aside>
          )}

          {/* Content Area */}
          <div className="flex-1 rounded-lg border border-border bg-card shadow-sm">
            <form onSubmit={handleSave} className="space-y-6 p-6 lg:p-8">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md border p-4 text-sm font-medium',
                    feedback.type === 'success'
                      ? 'border-success/20 bg-success/10 text-success'
                      : 'border-destructive/20 bg-destructive/10 text-destructive'
                  )}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Tab Title */}
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {tabs.find((t) => t.id === activeTab)?.name}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {activeTab === 'general' && 'Global system parameters and identity.'}
                  {activeTab === 'notifications' && 'Configure email/SMS logs and system stock alerts.'}
                  {activeTab === 'security' && 'Manage your account credentials and system authorization.'}
                  {activeTab === 'payments' && 'Configure third-party payment gateways and terminals.'}
                  {activeTab === 'online' && 'Identity settings for your customer-facing digital storefront.'}
                </p>
              </div>

              {/* TAB CONTENT: General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input id="storeName" type="text" name="storeName" value={settings.storeName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="storeEmail">Support Email</Label>
                    <Input id="storeEmail" type="email" name="storeEmail" value={settings.storeEmail} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Base Currency</Label>
                    <Select value={settings.currency} onValueChange={(v) => setField('currency', v)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input id="taxRate" type="number" step="0.1" name="taxRate" value={settings.taxRate} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lowStockThreshold">Low Stock Threshold (Units)</Label>
                    <Input id="lowStockThreshold" type="number" name="lowStockThreshold" value={settings.lowStockThreshold} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryWarningDays">Expiry Warning Threshold (Days)</Label>
                    <Input id="expiryWarningDays" type="number" name="expiryWarningDays" value={settings.expiryWarningDays} onChange={handleInputChange} required />
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <SettingRow
                    title="Email Alerts"
                    description="Receive daily audit summaries and operational logs via email."
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => setField('emailNotifications', v)}
                  />
                  <SettingRow
                    title="SMS Alerts"
                    description="Receive priority crisis alerts (critical inventory shortfall) via SMS."
                    checked={settings.smsNotifications}
                    onCheckedChange={(v) => setField('smsNotifications', v)}
                  />
                  <SettingRow
                    title="Low Stock Alerts"
                    description="Trigger system notifications when products drop below threshold level."
                    checked={settings.lowStockAlerts}
                    onCheckedChange={(v) => setField('lowStockAlerts', v)}
                  />
                  <SettingRow
                    title="Expiry Alerts"
                    description="Flag items automatically as they approach threshold warning days."
                    checked={settings.expiryAlerts}
                    onCheckedChange={(v) => setField('expiryAlerts', v)}
                  />
                </div>
              )}

              {/* TAB CONTENT: Security */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" name="currentPassword" value={security.currentPassword} onChange={handleSecurityChange} placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" name="newPassword" value={security.newPassword} onChange={handleSecurityChange} placeholder="New password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" name="confirmPassword" value={security.confirmPassword} onChange={handleSecurityChange} placeholder="Confirm password" />
                    </div>
                  </div>

                  <TwoFactorSettings />
                </div>
              )}

              {/* TAB CONTENT: Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="paystackPublicKey">Paystack Public Key</Label>
                      <Input id="paystackPublicKey" type="text" name="paystackPublicKey" value={settings.paystackPublicKey} onChange={handleInputChange} placeholder="pk_test_..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="paystackSecretKey">Paystack Secret Key</Label>
                      <Input id="paystackSecretKey" type="password" name="paystackSecretKey" value={settings.paystackSecretKey} onChange={handleInputChange} placeholder="sk_test_..." />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Active POS Payment Methods</Label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                        <span className="text-sm font-medium text-foreground">Cash</span>
                        <Switch checked={settings.enableCash} onCheckedChange={(v) => setField('enableCash', v)} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                        <span className="text-sm font-medium text-foreground">Card Terminals</span>
                        <Switch checked={settings.enableCard} onCheckedChange={(v) => setField('enableCard', v)} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                        <span className="text-sm font-medium text-foreground">Mobile Transfer</span>
                        <Switch checked={settings.enableTransfer} onCheckedChange={(v) => setField('enableTransfer', v)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Online Store */}
              {activeTab === 'online' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="onlineStoreName">Storefront Name</Label>
                    <Input id="onlineStoreName" type="text" name="storeName" value={settings.storeName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="onlineStoreEmail">Store Contact Email</Label>
                    <Input id="onlineStoreEmail" type="email" name="storeEmail" value={settings.storeEmail} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryCharge">Flat Delivery Charge (₦)</Label>
                    <Input id="deliveryCharge" type="number" name="deliveryCharge" value={settings.deliveryCharge} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="whatsappNumber">WhatsApp Orders Phone Number</Label>
                    <Input id="whatsappNumber" type="tel" name="whatsappNumber" value={settings.whatsappNumber} onChange={handleInputChange} placeholder="+234..." />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end border-t border-border pt-6">
                <Button type="submit" disabled={saving} isLoading={saving} className="gap-2">
                  {!saving && <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
