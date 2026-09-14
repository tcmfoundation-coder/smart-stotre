import { ACTIONS } from '@/components/quick-create-menu';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

function visibleLabelsFor(role: UserRole) {
  return ACTIONS.filter((action) => hasPermission(role, action.permission)).map((a) => a.label);
}

describe('Quick Create role/permission-based visibility', () => {
  it('shows a cashier no administrative creation shortcuts at all', () => {
    // A cashier's job is serving customers/processing sales, not
    // administering the store - every ACTIONS entry is an admin-style
    // record-creation shortcut, so none should be visible to them.
    expect(visibleLabelsFor('cashier')).toEqual([]);
  });

  it('shows a manager only what their permissions actually cover', () => {
    const labels = visibleLabelsFor('manager');
    expect(labels).toContain('Product'); // create_products
    expect(labels).toContain('Customer'); // manage_customers
    expect(labels).toContain('Supplier'); // manage_suppliers
    expect(labels).toContain('Purchase Order'); // create_purchase_orders
    // Manager holds view_expenses, not manage_expenses, and has no
    // manage_employees permission at all - both must stay hidden.
    expect(labels).not.toContain('Expense');
    expect(labels).not.toContain('Employee');
  });

  it('shows an admin every action, since admin holds every underlying permission', () => {
    const labels = visibleLabelsFor('admin');
    expect(labels).toEqual(ACTIONS.map((a) => a.label));
  });

  it('never lists an action the role cannot actually perform (UI mirrors real permissions)', () => {
    for (const role of ['admin', 'manager', 'cashier'] as UserRole[]) {
      for (const action of ACTIONS) {
        const shown = visibleLabelsFor(role).includes(action.label);
        expect(shown).toBe(hasPermission(role, action.permission));
      }
    }
  });
});
