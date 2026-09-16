import { ShoppingCart, Package, Truck, FileText, Wallet, Printer, LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface QuickActionsProps {
  onNewSale?: () => void;
  onAddProduct?: () => void;
  onReceiveStock?: () => void;
  onGenerateReport?: () => void;
  onRecordExpense?: () => void;
  onPrintReceipt?: () => void;
  allowedActions?: string[];
}

export function QuickActions({
  onNewSale,
  onAddProduct,
  onReceiveStock,
  onGenerateReport,
  onRecordExpense,
  onPrintReceipt,
  allowedActions,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    { id: 'new-sale', label: 'New Sale', icon: ShoppingCart, onClick: onNewSale || (() => {}) },
    { id: 'add-product', label: 'Add Product', icon: Package, onClick: onAddProduct || (() => {}) },
    { id: 'receive-stock', label: 'Receive Stock', icon: Truck, onClick: onReceiveStock || (() => {}) },
    { id: 'generate-report', label: 'Generate Report', icon: FileText, onClick: onGenerateReport || (() => {}) },
    { id: 'record-expense', label: 'Record Expense', icon: Wallet, onClick: onRecordExpense || (() => {}) },
    { id: 'print-receipt', label: 'Print Receipt', icon: Printer, onClick: onPrintReceipt || (() => {}) },
  ];

  const visibleActions = actions.filter((action) => !allowedActions || allowedActions.includes(action.id));

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-base font-semibold text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {visibleActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <action.icon className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-foreground">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
