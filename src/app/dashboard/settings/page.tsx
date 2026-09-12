'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { getDashboardRoleConfig } from '@/lib/dashboard-role';
import { Save, Store, Bell, Shield, CreditCard, Globe, AlertCircle, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { data: session, status } = useSession();
  const role = (session?.user?.role as string | undefined) || 'cashier';
  const roleConfig = getDashboardRoleConfig(role);
  const canAccessSettings = roleConfig.canAccessSettings;

  const tabs = [
    { id: 'general', name: 'General', icon: Store },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'online', name: 'Online Store', icon: Globe },
  ];

  // Fetch settings from API on mount
  useEffect(() => {
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
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (e.target as HTMLInputElement).checked : value;

    setSettings((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? e.target.checked : value;

    setSecurity((prev) => ({
      ...prev,
      [name]: val,
    }));
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
          setFeedback({ type: 'success', message: 'System configurations updated successfully!' });
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
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="System Settings" userRole="admin" />
        <main className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <DashboardHeader title="System Settings" userRole="admin" />
        <main className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-lg dark:border-rose-500/20 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Admin Access Required</h3>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Only administrators can view or change system control settings.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="System Settings" userRole="admin" />

      <main className="p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback(null);
                }}
                className={cn(
                  'w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-none'
                    : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </aside>

          {/* Content Area */}
          <div className="flex-1 bg-card rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border overflow-hidden">
            <form onSubmit={handleSave} className="p-10 space-y-8">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={cn(
                    'p-5 rounded-2xl flex items-center space-x-3 border animate-in fade-in duration-300',
                    feedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                  )}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-bold">{feedback.message}</span>
                </div>
              )}

              {/* Tab Title */}
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-8 w-1.5 bg-blue-600 rounded-full"></div>
                <div>
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">
                    {tabs.find((t) => t.id === activeTab)?.name} Config
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {activeTab === 'general' && 'Global system parameters and identity.'}
                    {activeTab === 'notifications' && 'Configure email/SMS logs and system stock alerts.'}
                    {activeTab === 'security' && 'Manage your account credentials and system authorization.'}
                    {activeTab === 'payments' && 'Configure third-party payment gateways and terminals.'}
                    {activeTab === 'online' && 'Identity settings for your customer-facing digital storefront.'}
                  </p>
                </div>
              </div>

              {/* TAB CONTENT: General */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      name="storeName"
                      value={settings.storeName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      name="storeEmail"
                      value={settings.storeEmail}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Base Currency
                    </label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none appearance-none"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="taxRate"
                      value={settings.taxRate}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Low Stock Threshold (Units)
                    </label>
                    <input
                      type="number"
                      name="lowStockThreshold"
                      value={settings.lowStockThreshold}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Expiry Warning Threshold (Days)
                    </label>
                    <input
                      type="number"
                      name="expiryWarningDays"
                      value={settings.expiryWarningDays}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border">
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Email Alerts</h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-1">Receive daily audit summaries and operational logs via email.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={settings.emailNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border">
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">SMS Alerts</h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-1">Receive priority crisis alerts (critical inventory shortfall) via SMS.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="smsNotifications"
                        checked={settings.smsNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border">
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Low Stock Alerts</h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-1">Trigger system notifications when products drop below threshold level.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="lowStockAlerts"
                        checked={settings.lowStockAlerts}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border border-border">
                    <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Expiry Alerts</h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-1">Flag items automatically as they approach threshold warning days.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="expiryAlerts"
                        checked={settings.expiryAlerts}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Security */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={security.currentPassword}
                        onChange={handleSecurityChange}
                        placeholder="••••••••"
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={security.newPassword}
                        onChange={handleSecurityChange}
                        placeholder="New Password"
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={security.confirmPassword}
                        onChange={handleSecurityChange}
                        placeholder="Confirm Password"
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <TwoFactorSettings />
                </div>
              )}

              {/* TAB CONTENT: Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                        Paystack Public Key
                      </label>
                      <input
                        type="text"
                        name="paystackPublicKey"
                        value={settings.paystackPublicKey}
                        onChange={handleInputChange}
                        placeholder="pk_test_..."
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                        Paystack Secret Key
                      </label>
                      <input
                        type="password"
                        name="paystackSecretKey"
                        value={settings.paystackSecretKey}
                        onChange={handleInputChange}
                        placeholder="sk_test_..."
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Active POS Payment Methods
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border">
                        <span className="text-sm font-bold text-foreground/80">Cash Settlements</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="enableCash"
                            checked={settings.enableCash}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="w-12 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border">
                        <span className="text-sm font-bold text-foreground/80">Card Terminals</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="enableCard"
                            checked={settings.enableCard}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="w-12 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border">
                        <span className="text-sm font-bold text-foreground/80">Mobile Transfer</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="enableTransfer"
                            checked={settings.enableTransfer}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="w-12 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Online Store */}
              {activeTab === 'online' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Storefront Name
                    </label>
                    <input
                      type="text"
                      name="storeName"
                      value={settings.storeName}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Store Contact Email
                    </label>
                    <input
                      type="email"
                      name="storeEmail"
                      value={settings.storeEmail}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Flat Delivery Charge (₦)
                    </label>
                    <input
                      type="number"
                      name="deliveryCharge"
                      value={settings.deliveryCharge}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      WhatsApp Orders Phone Number
                    </label>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={settings.whatsappNumber}
                      onChange={handleInputChange}
                      placeholder="+234..."
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-8 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  <span>{saving ? 'SAVING...' : 'SAVE CONFIGURATION'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
