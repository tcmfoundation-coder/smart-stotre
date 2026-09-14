export type UserRole = 'admin' | 'manager' | 'cashier';

export interface Permission {
  name: string;
  description: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  allowedRoutes: string[];
  dashboardCards: string[];
}

// Define all available permissions
export const PERMISSIONS = {
  // User Management
  CREATE_USERS: { name: 'create_users', description: 'Create new users' },
  EDIT_USERS: { name: 'edit_users', description: 'Edit existing users' },
  DELETE_USERS: { name: 'delete_users', description: 'Delete users' },
  ASSIGN_ROLES: { name: 'assign_roles', description: 'Assign roles to users' },
  
  // Product Management
  CREATE_PRODUCTS: { name: 'create_products', description: 'Create new products' },
  EDIT_PRODUCTS: { name: 'edit_products', description: 'Edit products' },
  DELETE_PRODUCTS: { name: 'delete_products', description: 'Delete products' },
  VIEW_PRODUCTS: { name: 'view_products', description: 'View products' },
  
  // Inventory Management
  MANAGE_INVENTORY: { name: 'manage_inventory', description: 'Manage inventory levels' },
  STOCK_ADJUSTMENTS: { name: 'stock_adjustments', description: 'Make stock adjustments' },
  APPROVE_STOCK_ADJUSTMENTS: { name: 'approve_stock_adjustments', description: 'Approve stock adjustments' },
  
  // Supplier Management
  MANAGE_SUPPLIERS: { name: 'manage_suppliers', description: 'Manage suppliers' },
  CREATE_PURCHASE_ORDERS: { name: 'create_purchase_orders', description: 'Create purchase orders' },
  APPROVE_PURCHASE_ORDERS: { name: 'approve_purchase_orders', description: 'Approve purchase orders' },
  
  // Customer Management
  MANAGE_CUSTOMERS: { name: 'manage_customers', description: 'Manage customers' },
  VIEW_CUSTOMERS: { name: 'view_customers', description: 'View customers' },
  
  // Sales Management
  CREATE_SALES: { name: 'create_sales', description: 'Create sales transactions' },
  PROCESS_PAYMENTS: { name: 'process_payments', description: 'Process payments' },
  PROCESS_RETURNS: { name: 'process_returns', description: 'Process returns' },
  VIEW_SALES: { name: 'view_sales', description: 'View sales' },
  VIEW_OWN_SALES: { name: 'view_own_sales', description: 'View own sales only' },
  
  // Reports
  VIEW_SALES_REPORTS: { name: 'view_sales_reports', description: 'View sales reports' },
  VIEW_INVENTORY_REPORTS: { name: 'view_inventory_reports', description: 'View inventory reports' },
  VIEW_FINANCIAL_REPORTS: { name: 'view_financial_reports', description: 'View financial reports' },
  VIEW_CUSTOMER_REPORTS: { name: 'view_customer_reports', description: 'View customer reports' },
  
  // System Management
  MANAGE_SETTINGS: { name: 'manage_settings', description: 'Manage system settings' },
  BACKUP_RESTORE: { name: 'backup_restore', description: 'Backup and restore database' },
  VIEW_ACTIVITY_LOGS: { name: 'view_activity_logs', description: 'View activity logs' },
  MANAGE_NOTIFICATIONS: { name: 'manage_notifications', description: 'Manage notifications' },
  
  // Promotions
  MANAGE_PROMOTIONS: { name: 'manage_promotions', description: 'Manage promotions and discounts' },
  APPLY_DISCOUNTS: { name: 'apply_discounts', description: 'Apply discounts to sales' },
  
  // Expenses
  MANAGE_EXPENSES: { name: 'manage_expenses', description: 'Manage expenses' },
  VIEW_EXPENSES: { name: 'view_expenses', description: 'View expenses' },
  
  // Categories
  MANAGE_CATEGORIES: { name: 'manage_categories', description: 'Manage product categories' },
  
  // Branches
  MANAGE_BRANCHES: { name: 'manage_branches', description: 'Manage branches' },
  
  // Employees
  MANAGE_EMPLOYEES: { name: 'manage_employees', description: 'Manage employees' },
  VIEW_EMPLOYEES: { name: 'view_employees', description: 'View employees' },
} as const;

// Role-based permission configurations
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    role: 'admin',
    permissions: [
      PERMISSIONS.CREATE_USERS,
      PERMISSIONS.EDIT_USERS,
      PERMISSIONS.DELETE_USERS,
      PERMISSIONS.ASSIGN_ROLES,
      PERMISSIONS.CREATE_PRODUCTS,
      PERMISSIONS.EDIT_PRODUCTS,
      PERMISSIONS.DELETE_PRODUCTS,
      PERMISSIONS.VIEW_PRODUCTS,
      PERMISSIONS.MANAGE_INVENTORY,
      PERMISSIONS.STOCK_ADJUSTMENTS,
      PERMISSIONS.APPROVE_STOCK_ADJUSTMENTS,
      PERMISSIONS.MANAGE_SUPPLIERS,
      PERMISSIONS.CREATE_PURCHASE_ORDERS,
      PERMISSIONS.APPROVE_PURCHASE_ORDERS,
      PERMISSIONS.MANAGE_CUSTOMERS,
      PERMISSIONS.VIEW_CUSTOMERS,
      PERMISSIONS.CREATE_SALES,
      PERMISSIONS.PROCESS_PAYMENTS,
      PERMISSIONS.PROCESS_RETURNS,
      PERMISSIONS.VIEW_SALES,
      PERMISSIONS.VIEW_SALES_REPORTS,
      PERMISSIONS.VIEW_INVENTORY_REPORTS,
      PERMISSIONS.VIEW_FINANCIAL_REPORTS,
      PERMISSIONS.VIEW_CUSTOMER_REPORTS,
      PERMISSIONS.MANAGE_SETTINGS,
      PERMISSIONS.BACKUP_RESTORE,
      PERMISSIONS.VIEW_ACTIVITY_LOGS,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
      PERMISSIONS.MANAGE_PROMOTIONS,
      PERMISSIONS.APPLY_DISCOUNTS,
      PERMISSIONS.MANAGE_EXPENSES,
      PERMISSIONS.VIEW_EXPENSES,
      PERMISSIONS.MANAGE_CATEGORIES,
      PERMISSIONS.MANAGE_BRANCHES,
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.VIEW_EMPLOYEES,
    ],
    allowedRoutes: [
      '/dashboard',
      '/dashboard/sales',
      '/dashboard/products',
      '/dashboard/categories',
      '/dashboard/inventory',
      '/dashboard/stock-adjustments',
      '/dashboard/purchase-orders',
      '/dashboard/suppliers',
      '/dashboard/customers',
      '/dashboard/employees',
      '/dashboard/users',
      '/dashboard/roles',
      '/dashboard/reports',
      '/dashboard/financial-reports',
      '/dashboard/promotions',
      '/dashboard/expenses',
      '/dashboard/notifications',
      '/dashboard/profile',
      '/dashboard/activity-logs',
      '/dashboard/settings',
      '/dashboard/backup',
      '/dashboard/active-users',
      '/dashboard/pos',
      '/dashboard/online-orders',
      '/dashboard/whatsapp-orders',
      '/dashboard/whatsapp-messages',
      '/dashboard/barcode',
      '/dashboard/ai-assistant',
      '/dashboard/ai-predictions',
      '/dashboard/branches',
    ],
    dashboardCards: [
      'totalRevenue',
      'todaySales',
      'monthlySales',
      'totalProducts',
      'lowStockProducts',
      'outOfStockProducts',
      'totalEmployees',
      'totalCustomers',
      'pendingPurchaseOrders',
      'totalSuppliers',
    ],
  },
  manager: {
    role: 'manager',
    permissions: [
      PERMISSIONS.CREATE_PRODUCTS,
      PERMISSIONS.EDIT_PRODUCTS,
      PERMISSIONS.VIEW_PRODUCTS,
      PERMISSIONS.MANAGE_INVENTORY,
      PERMISSIONS.STOCK_ADJUSTMENTS,
      PERMISSIONS.APPROVE_STOCK_ADJUSTMENTS,
      PERMISSIONS.MANAGE_SUPPLIERS,
      PERMISSIONS.CREATE_PURCHASE_ORDERS,
      PERMISSIONS.APPROVE_PURCHASE_ORDERS,
      PERMISSIONS.MANAGE_CUSTOMERS,
      PERMISSIONS.VIEW_CUSTOMERS,
      PERMISSIONS.CREATE_SALES,
      PERMISSIONS.PROCESS_PAYMENTS,
      PERMISSIONS.PROCESS_RETURNS,
      PERMISSIONS.VIEW_SALES,
      PERMISSIONS.VIEW_SALES_REPORTS,
      PERMISSIONS.VIEW_INVENTORY_REPORTS,
      PERMISSIONS.VIEW_CUSTOMER_REPORTS,
      PERMISSIONS.MANAGE_PROMOTIONS,
      PERMISSIONS.APPLY_DISCOUNTS,
      PERMISSIONS.VIEW_EXPENSES,
      PERMISSIONS.MANAGE_CATEGORIES,
      PERMISSIONS.VIEW_EMPLOYEES,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
    ],
    allowedRoutes: [
      '/dashboard',
      '/dashboard/sales',
      '/dashboard/products',
      '/dashboard/categories',
      '/dashboard/inventory',
      '/dashboard/purchase-orders',
      '/dashboard/suppliers',
      '/dashboard/customers',
      '/dashboard/reports',
      '/dashboard/promotions',
      '/dashboard/notifications',
      '/dashboard/profile',
      '/inventory',
      '/dashboard/pos',
      '/dashboard/online-orders',
      '/dashboard/whatsapp-orders',
      '/dashboard/whatsapp-messages',
      '/dashboard/barcode',
      '/dashboard/ai-assistant',
      '/dashboard/ai-predictions',
    ],
    dashboardCards: [
      'todaySales',
      'weeklySales',
      'monthlySales',
      'totalProducts',
      'lowStockAlerts',
      'outOfStockItems',
      'pendingPurchaseOrders',
      'activeSuppliers',
      'customerCount',
    ],
  },
  cashier: {
    role: 'cashier',
    permissions: [
      PERMISSIONS.VIEW_PRODUCTS,
      PERMISSIONS.CREATE_SALES,
      PERMISSIONS.PROCESS_PAYMENTS,
      PERMISSIONS.PROCESS_RETURNS,
      PERMISSIONS.VIEW_OWN_SALES,
      PERMISSIONS.APPLY_DISCOUNTS,
      PERMISSIONS.VIEW_CUSTOMERS,
      PERMISSIONS.MANAGE_NOTIFICATIONS,
    ],
    allowedRoutes: [
      '/dashboard',
      '/dashboard/pos',
      '/dashboard/products',
      '/dashboard/customers',
      '/dashboard/returns',
      '/dashboard/receipt-history',
      '/dashboard/shift-summary',
      '/dashboard/notifications',
      '/dashboard/profile',
      '/dashboard/barcode',
    ],
    dashboardCards: [
      'todaySales',
      'numberOfTransactions',
      'itemsSoldToday',
      'currentShiftSales',
    ],
  },
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permissionName: string): boolean {
  const roleConfig = ROLE_PERMISSIONS[role];
  return roleConfig.permissions.some(p => p.name === permissionName);
}

// Check if a role can access a route
export function canAccessRoute(role: UserRole, route: string): boolean {
  const roleConfig = ROLE_PERMISSIONS[role];
  // Check exact match or prefix match
  return roleConfig.allowedRoutes.some(allowedRoute => {
    if (allowedRoute === route) return true;
    // Check if route starts with allowed route (for nested routes)
    if (route.startsWith(allowedRoute + '/')) return true;
    return false;
  });
}

// Get allowed routes for a role
export function getAllowedRoutes(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role].allowedRoutes;
}

// Get dashboard cards for a role
export function getDashboardCards(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role].dashboardCards;
}

// Check if user can access another user's data
export function canAccessUserData(currentRole: UserRole, targetUserId: string, currentUserId: string): boolean {
  if (currentRole === 'admin') return true;
  if (currentRole === 'manager') return true;
  if (currentRole === 'cashier') return targetUserId === currentUserId;
  return false;
}
