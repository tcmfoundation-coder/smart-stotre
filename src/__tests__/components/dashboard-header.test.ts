import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardHeader } from '@/components/dashboard-header';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Jane Cashier', email: 'jane@smartmart.com', role: 'cashier' } },
  }),
  signOut: jest.fn(),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));

// fetch is called in a useEffect (unread notification count), which does
// not run under renderToStaticMarkup, but stub it defensively anyway.
global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, count: 0 }) }) as any;

describe('DashboardHeader', () => {
  it('renders the page title', () => {
    const markup = renderToStaticMarkup(React.createElement(DashboardHeader, { title: 'Point of Sale', userRole: 'cashier' }));
    expect(markup).toContain('Point of Sale');
  });

  it('has no standalone Theme toggle or Logout button in the header itself - those live in the profile menu now', () => {
    const markup = renderToStaticMarkup(React.createElement(DashboardHeader, { title: 'Point of Sale', userRole: 'cashier' }));
    expect(markup).not.toMatch(/Logout/i);
    expect(markup).not.toContain('Log Out');
  });

  it('does not render a Quick Create button for a cashier', () => {
    const markup = renderToStaticMarkup(React.createElement(DashboardHeader, { title: 'Point of Sale', userRole: 'cashier' }));
    expect(markup).not.toContain('Quick Create');
  });

  it('still renders notifications', () => {
    const markup = renderToStaticMarkup(React.createElement(DashboardHeader, { title: 'Point of Sale', userRole: 'cashier' }));
    expect(markup).toContain('/dashboard/notifications');
  });
});
