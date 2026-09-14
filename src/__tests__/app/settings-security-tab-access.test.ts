import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SettingsPage from '@/app/dashboard/settings/page';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/components/settings/TwoFactorSettings', () => ({
  TwoFactorSettings: () => null,
}));

jest.mock('@/components/dashboard-header', () => ({
  DashboardHeader: () => null,
}));

global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, data: {} }) }) as any;

import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function mockRole(role: string) {
  (useSession as jest.Mock).mockReturnValue({ data: { user: { role } }, status: 'authenticated' });
}

function mockSearchParams(params: Record<string, string>) {
  (useSearchParams as jest.Mock).mockReturnValue({
    get: (key: string) => params[key] ?? null,
  });
}

describe('Settings page - security tab access for non-admin roles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a cashier reach the Security tab via ?tab=security instead of the Admin Access Required wall', () => {
    mockRole('cashier');
    mockSearchParams({ tab: 'security' });

    const markup = renderToStaticMarkup(React.createElement(SettingsPage));

    expect(markup).not.toContain('Admin Access Required');
    expect(markup).toContain('Current Password');
    expect(markup).toContain('New Password');
  });

  it('lets a manager reach the Security tab the same way', () => {
    mockRole('manager');
    mockSearchParams({ tab: 'security' });

    const markup = renderToStaticMarkup(React.createElement(SettingsPage));

    expect(markup).not.toContain('Admin Access Required');
    expect(markup).toContain('Current Password');
  });

  it('still blocks a cashier from the general System Settings tabs', () => {
    mockRole('cashier');
    mockSearchParams({}); // no ?tab= - defaults toward general, which they can't reach

    const markup = renderToStaticMarkup(React.createElement(SettingsPage));

    expect(markup).toContain('Admin Access Required');
  });

  it('does not wall an admin off with Admin Access Required (they load their settings instead)', () => {
    mockRole('admin');
    mockSearchParams({});

    const markup = renderToStaticMarkup(React.createElement(SettingsPage));

    // Admin genuinely does need to wait on GET /api/settings (unlike the
    // security-only roles above), so the static render catches them
    // mid-fetch - the meaningful assertion is that they're not walled off.
    expect(markup).not.toContain('Admin Access Required');
    expect(markup).toContain('Loading settings');
  });

  it('does not show the other admin-only tabs to a cashier viewing Security', () => {
    mockRole('cashier');
    mockSearchParams({ tab: 'security' });

    const markup = renderToStaticMarkup(React.createElement(SettingsPage));

    // The tab switcher itself should not render for a role limited to one tab.
    expect(markup).not.toContain('Online Store');
  });
});
