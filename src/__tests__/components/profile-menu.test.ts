import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileMenu } from '@/components/profile-menu';

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

describe('ProfileMenu', () => {
  it('renders the avatar trigger with the session name and role, not a raw error', () => {
    const markup = renderToStaticMarkup(React.createElement(ProfileMenu, { role: 'cashier' }));
    expect(markup).toContain('Jane Cashier');
    expect(markup).toContain('cashier');
    // The initial-letter avatar badge
    expect(markup).toContain('>J<');
  });

  it('does not render standalone Theme/Logout buttons alongside the trigger - only the avatar', () => {
    const markup = renderToStaticMarkup(React.createElement(ProfileMenu, { role: 'admin' }));
    // The trigger itself is the only always-rendered control; the menu
    // items (closed by default) are not present in the static markup.
    expect(markup).not.toContain('Log Out');
  });
});
