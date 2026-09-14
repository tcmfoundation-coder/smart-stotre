'use client';

import { useRouter } from 'next/navigation';
import { Plus, Package, UserPlus, Truck, ShoppingCart, Wallet, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

interface QuickCreateMenuProps {
  role: UserRole;
}

export interface QuickCreateAction {
  label: string;
  href: string;
  icon: typeof Package;
  permission: string;
}

// Genuine record-creation shortcuts only - not "New Sale" (that's a
// cashier/manager/admin's routine workflow, already one click away via
// POS, not an administrative shortcut worth a "quick create" entry).
// Each entry is gated by the same permission its destination page/API
// enforces server-side - this list only controls what's *shown*.
export const ACTIONS: QuickCreateAction[] = [
  { label: 'Product', href: '/dashboard/inventory/new', icon: Package, permission: 'create_products' },
  { label: 'Customer', href: '/dashboard/customers/new', icon: UserPlus, permission: 'manage_customers' },
  { label: 'Supplier', href: '/dashboard/suppliers/new', icon: Truck, permission: 'manage_suppliers' },
  { label: 'Purchase Order', href: '/dashboard/purchase-orders', icon: ShoppingCart, permission: 'create_purchase_orders' },
  { label: 'Expense', href: '/dashboard/expenses', icon: Wallet, permission: 'manage_expenses' },
  { label: 'Employee', href: '/dashboard/employees/new', icon: UserCog, permission: 'manage_employees' },
];

export function QuickCreateMenu({ role }: QuickCreateMenuProps) {
  const router = useRouter();
  const available = ACTIONS.filter((action) => hasPermission(role, action.permission));

  // Nothing this user is permitted to create - e.g. a cashier, whose job
  // is serving customers, not administering the store. No button at all,
  // rather than an empty or disabled one.
  if (available.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="primary" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((action) => (
          <DropdownMenuItem key={action.href} onClick={() => router.push(action.href)}>
            <action.icon className="h-4 w-4 text-muted-foreground" />
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
