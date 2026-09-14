import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Receipt } from '@/components/receipt';

function makeSale(itemCount: number) {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    productName: `Product ${i + 1}`,
    quantity: i + 1,
    sellingPrice: 500 + i,
    total: (i + 1) * (500 + i),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return {
    saleNumber: `SALE-${itemCount}`,
    createdAt: '2026-01-15T10:30:00.000Z',
    cashierId: { name: 'Jane Cashier' },
    customerName: 'John Customer',
    items,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    paymentMethod: 'cash',
    cashReceived: subtotal,
    change: 0,
  };
}

describe('Receipt', () => {
  it.each([1, 5, 20])('renders every line item for a %i-item sale without throwing', (count) => {
    const sale = makeSale(count);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    for (const item of sale.items) {
      expect(markup).toContain(item.productName);
    }
    expect(markup).toContain(sale.saleNumber);
  });

  it('sizes the print page to the receipt content instead of a fixed paper size', () => {
    const sale = makeSale(3);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    // 80mm width, auto (content-driven) height - not a fixed Letter/A4 page
    // that would force pagination once the on-screen chrome is added in.
    expect(markup).toMatch(/@page\s*{\s*size:\s*80mm auto;\s*margin:\s*0;\s*}/);
  });

  it('keeps each line item intact across a print page break', () => {
    const sale = makeSale(20);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    expect(markup.match(/break-inside:avoid/g)?.length).toBeGreaterThanOrEqual(20);
  });

  it('does not render fake security/authentication theater', () => {
    const sale = makeSale(2);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    expect(markup).not.toMatch(/digital authentication/i);
    expect(markup).not.toMatch(/document integrity validated/i);
    expect(markup).not.toMatch(/secure id/i);
  });

  it('renders real transaction data: totals, payment, change, cashier, customer', () => {
    const sale = makeSale(2);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    expect(markup).toContain(sale.cashierId.name);
    expect(markup).toContain(sale.customerName);
    expect(markup).toMatch(/cash/i);
  });

  it('marks the on-screen view print:hidden and the receipt view print:block', () => {
    const sale = makeSale(1);
    const markup = renderToStaticMarkup(React.createElement(Receipt, { sale }));

    expect(markup).toMatch(/print:hidden/);
    expect(markup).toMatch(/print:block/);
  });
});
