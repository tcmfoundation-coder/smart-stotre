export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial';

// Maps each generic Report record's `type` to the same permission that
// already gates its dedicated report page in rbac.ts, so this shared
// generate/list/delete endpoint can't be used to bypass those permissions.
export const REPORT_TYPE_PERMISSIONS: Record<ReportType, string> = {
  sales: 'view_sales_reports',
  inventory: 'view_inventory_reports',
  customers: 'view_customer_reports',
  financial: 'view_financial_reports',
};

export const ALL_REPORT_TYPES: ReportType[] = ['sales', 'inventory', 'customers', 'financial'];
