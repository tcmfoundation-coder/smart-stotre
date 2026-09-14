import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickCreateMenu } from '@/components/quick-create-menu';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('QuickCreateMenu rendering', () => {
  it('renders nothing at all for a cashier - no empty/disabled button either', () => {
    const markup = renderToStaticMarkup(React.createElement(QuickCreateMenu, { role: 'cashier' }));
    expect(markup).toBe('');
  });

  it('renders the trigger button for an admin', () => {
    const markup = renderToStaticMarkup(React.createElement(QuickCreateMenu, { role: 'admin' }));
    expect(markup).toContain('Quick Create');
  });

  it('renders the trigger button for a manager', () => {
    const markup = renderToStaticMarkup(React.createElement(QuickCreateMenu, { role: 'manager' }));
    expect(markup).toContain('Quick Create');
  });
});
