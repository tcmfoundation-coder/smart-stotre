import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Wallet, 
  BarChart3, 
  Bell, 
  Scan, 
  Brain, 
  Store, 
  MessageSquare,
  Settings,
  ChevronRight,
  Layers,
  Activity,
  Shield,
  Database,
  FileText,
  Percent,
  History,
  UserCheck,
  Building2,
  Receipt,
  Printer,
  Search,
  ArrowLeftRight
} from 'lucide-react';
import { UserRole } from '@/lib/rbac';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: UserRole[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAVIGATION: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Executive Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    ]
  },
  {
    title: 'Sales',
    items: [
      { name: 'Revenue Intel', href: '/dashboard/sales', icon: BarChart3, roles: ['admin'] },
      { name: 'Digital Fulfilment', href: '/dashboard/online-orders', icon: ShoppingCart, roles: ['admin'] },
      { name: 'Social Commerce', href: '/dashboard/whatsapp-orders', icon: MessageSquare, roles: ['admin'] },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Inventory Ledger', href: '/dashboard/inventory', icon: Package, roles: ['admin'] },
      { name: 'Product Catalog', href: '/dashboard/products', icon: Package, roles: ['admin'] },
      { name: 'Categories', href: '/dashboard/categories', icon: Layers, roles: ['admin'] },
      { name: 'Stock Adjustments', href: '/dashboard/stock-adjustments', icon: ArrowLeftRight, roles: ['admin'] },
      { name: 'Supply Chain', href: '/dashboard/suppliers', icon: Truck, roles: ['admin'] },
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingCart, roles: ['admin'] },
    ]
  },
  {
    title: 'Customers',
    items: [
      { name: 'Customer Base', href: '/dashboard/customers', icon: Users, roles: ['admin'] },
      { name: 'WhatsApp Messages', href: '/dashboard/whatsapp-messages', icon: MessageSquare, roles: ['admin'] },
    ]
  },
  {
    title: 'Finance',
    items: [
      { name: 'Expenditure', href: '/dashboard/expenses', icon: Wallet, roles: ['admin'] },
      { name: 'Financial Reports', href: '/dashboard/financial-reports', icon: FileText, roles: ['admin'] },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Human Capital', href: '/dashboard/employees', icon: Users, roles: ['admin'] },
      { name: 'User Accounts', href: '/dashboard/users', icon: UserCheck, roles: ['admin'] },
      { name: 'Roles & Permissions', href: '/dashboard/roles', icon: Shield, roles: ['admin'] },
      { name: 'Node Network', href: '/dashboard/branches', icon: Store, roles: ['admin'] },
      { name: 'Active Users', href: '/dashboard/active-users', icon: Activity, roles: ['admin'] },
      { name: 'System Alerts', href: '/dashboard/notifications', icon: Bell, roles: ['admin'] },
      { name: 'Activity Logs', href: '/dashboard/activity-logs', icon: History, roles: ['admin'] },
      { name: 'Optical Scanner', href: '/dashboard/barcode', icon: Scan, roles: ['admin'] },
    ]
  },
  {
    title: 'Reports',
    items: [
      { name: 'Reports Center', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { name: 'Discounts & Promotions', href: '/dashboard/promotions', icon: Percent, roles: ['admin'] },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Brain, roles: ['admin'] },
      { name: 'AI Forecasts', href: '/dashboard/ai-predictions', icon: Layers, roles: ['admin'] },
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'System Control', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
      { name: 'Backup & Restore', href: '/dashboard/backup', icon: Database, roles: ['admin'] },
    ]
  },
];

export const MANAGER_NAVIGATION: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Operations Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['manager'] },
    ]
  },
  {
    title: 'Sales',
    items: [
      { name: 'Sales Analytics', href: '/dashboard/sales', icon: BarChart3, roles: ['manager'] },
      { name: 'Digital Fulfilment', href: '/dashboard/online-orders', icon: ShoppingCart, roles: ['manager'] },
      { name: 'Social Commerce', href: '/dashboard/whatsapp-orders', icon: MessageSquare, roles: ['manager'] },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Inventory Ledger', href: '/dashboard/inventory', icon: Package, roles: ['manager'] },
      { name: 'Product Catalog', href: '/dashboard/products', icon: Package, roles: ['manager'] },
      { name: 'Categories', href: '/dashboard/categories', icon: Layers, roles: ['manager'] },
      { name: 'Supply Chain', href: '/dashboard/suppliers', icon: Truck, roles: ['manager'] },
      { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingCart, roles: ['manager'] },
    ]
  },
  {
    title: 'Customers',
    items: [
      { name: 'Customer Base', href: '/dashboard/customers', icon: Users, roles: ['manager'] },
      { name: 'WhatsApp Messages', href: '/dashboard/whatsapp-messages', icon: MessageSquare, roles: ['manager'] },
    ]
  },
  {
    title: 'Reports',
    items: [
      { name: 'Reports Center', href: '/dashboard/reports', icon: FileText, roles: ['manager'] },
      { name: 'Inventory Reports', href: '/dashboard/inventory-reports', icon: BarChart3, roles: ['manager'] },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { name: 'Promotions', href: '/dashboard/promotions', icon: Percent, roles: ['manager'] },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['manager'] },
      { name: 'System Alerts', href: '/dashboard/notifications', icon: Bell, roles: ['manager'] },
      { name: 'Optical Scanner', href: '/dashboard/barcode', icon: Scan, roles: ['manager'] },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Brain, roles: ['manager'] },
      { name: 'AI Forecasts', href: '/dashboard/ai-predictions', icon: Layers, roles: ['manager'] },
    ]
  },
];

export const CASHIER_NAVIGATION: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Cashier Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['cashier'] },
    ]
  },
  {
    title: 'Point of Sale',
    items: [
      { name: 'POS Terminal', href: '/dashboard/pos', icon: Scan, roles: ['cashier'] },
      { name: 'New Sale', href: '/dashboard/pos', icon: ShoppingCart, roles: ['cashier'] },
      { name: 'Product Search', href: '/dashboard/products', icon: Search, roles: ['cashier'] },
    ]
  },
  {
    title: 'Customers',
    items: [
      { name: 'Customer Lookup', href: '/dashboard/customers', icon: Users, roles: ['cashier'] },
    ]
  },
  {
    title: 'Transactions',
    items: [
      { name: 'Returns', href: '/dashboard/returns', icon: ArrowLeftRight, roles: ['cashier'] },
      { name: 'Receipt History', href: '/dashboard/receipts', icon: Receipt, roles: ['cashier'] },
      { name: 'Shift Summary', href: '/dashboard/shift-summary', icon: FileText, roles: ['cashier'] },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, roles: ['cashier'] },
      { name: 'Optical Scanner', href: '/dashboard/barcode', icon: Scan, roles: ['cashier'] },
    ]
  },
];

export function getNavigationByRole(role: UserRole): NavGroup[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAVIGATION;
    case 'manager':
      return MANAGER_NAVIGATION;
    case 'cashier':
      return CASHIER_NAVIGATION;
    default:
      return [];
  }
}
