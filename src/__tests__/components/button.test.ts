import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('forwards button props to the underlying element', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        Button,
        // data-* attributes are forwarded at runtime (verified below) but
        // aren't part of ButtonProps' declared type.
        { type: 'submit', 'aria-label': 'Complete sale', 'data-testid': 'complete-sale' } as React.ComponentProps<typeof Button>,
        'Complete sale'
      )
    );

    expect(markup).toContain('type="submit"');
    expect(markup).toContain('aria-label="Complete sale"');
    expect(markup).toContain('data-testid="complete-sale"');
  });
});
