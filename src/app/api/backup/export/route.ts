import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { logActivity } from '@/lib/activity-log';
import {
  User,
  Category,
  Product,
  Customer,
  Supplier,
  Sale,
  Expense,
  Employee,
  Branch,
  Notification,
  AIReport,
  Order,
  Transaction,
  Loyalty,
  WhatsAppMessage,
  UserActivity,
  StockAdjustment,
  PurchaseOrder,
  Report,
  Role,
  Promotion,
  ActivityLog,
  Return,
  Shift,
} from '@/models';

// Real database export, not a fake list of pretend backup files - see the
// "Backup & Restore" architecture section in SMART_STORE_AUDIT.md for the
// full investigation. Every model registered in src/models/index.ts is
// listed here explicitly (a new model added later must be added to this
// list too - a deliberate simplicity/testability trade-off over enumerating
// every raw MongoDB collection generically). Streamed directly to the
// requesting admin's browser; nothing is written to server-side disk or any
// datastore, so there's no server-side "backup" to leak or clean up.
const EXPORTABLE_COLLECTIONS: { name: string; model: { find: () => { lean: () => Promise<unknown[]> } } }[] = [
  { name: 'users', model: User },
  { name: 'categories', model: Category },
  { name: 'products', model: Product },
  { name: 'customers', model: Customer },
  { name: 'suppliers', model: Supplier },
  { name: 'sales', model: Sale },
  { name: 'expenses', model: Expense },
  { name: 'employees', model: Employee },
  { name: 'branches', model: Branch },
  { name: 'notifications', model: Notification },
  { name: 'aiReports', model: AIReport },
  { name: 'orders', model: Order },
  { name: 'transactions', model: Transaction },
  { name: 'loyalty', model: Loyalty },
  { name: 'whatsAppMessages', model: WhatsAppMessage },
  { name: 'userActivity', model: UserActivity },
  { name: 'stockAdjustments', model: StockAdjustment },
  { name: 'purchaseOrders', model: PurchaseOrder },
  { name: 'reports', model: Report },
  { name: 'roles', model: Role },
  { name: 'promotions', model: Promotion },
  { name: 'activityLogs', model: ActivityLog },
  { name: 'returns', model: Return },
  { name: 'shifts', model: Shift },
];

export async function GET(request: NextRequest) {
  return withPermission('backup_restore')(async (req, user) => {
    try {
      await connectDB();

      const generatedAt = new Date().toISOString();
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            controller.enqueue(
              encoder.encode(
                `{"generatedAt":${JSON.stringify(generatedAt)},` +
                  `"note":"Hashed passwords and encrypted secrets are included exactly as stored (never plaintext) so this export can restore login capability. Handle it with the same care as direct database access.",` +
                  `"collections":{`
              )
            );

            for (let i = 0; i < EXPORTABLE_COLLECTIONS.length; i++) {
              const { name, model } = EXPORTABLE_COLLECTIONS[i];
              const docs = await model.find().lean();
              const comma = i < EXPORTABLE_COLLECTIONS.length - 1 ? ',' : '';
              controller.enqueue(encoder.encode(`${JSON.stringify(name)}:${JSON.stringify(docs)}${comma}`));
            }

            controller.enqueue(encoder.encode('}}'));
            controller.close();
          } catch (streamError) {
            controller.error(streamError);
          }
        },
      });

      logActivity({
        action: 'DATABASE_EXPORTED',
        description: `${user.name || 'An admin'} exported a full database backup`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role,
        severity: 'warning',
      });

      const filename = `smart-store-backup-${generatedAt.slice(0, 19).replace(/[:.]/g, '-')}.json`;

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('Backup export failed:', error);
      return NextResponse.json({ success: false, error: 'Failed to generate backup export' }, { status: 500 });
    }
  })(request);
}
