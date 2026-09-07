import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export interface LogActivityInput {
  action: string;
  description: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

// Best-effort: a logging failure must never fail the operation being logged.
export async function logActivity(entry: LogActivityInput): Promise<void> {
  try {
    await connectDB();
    await ActivityLog.create({ severity: 'info', ...entry });
  } catch (err) {
    console.error('Failed to record activity log:', err);
  }
}
