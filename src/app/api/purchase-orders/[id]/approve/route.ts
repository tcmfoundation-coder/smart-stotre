import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { PurchaseOrder } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_purchase_orders')(async (req, user) => {
    try {
      await connectDB();

      // Atomic compare-and-swap: only a still-pending order matches, so a
      // concurrent or retried approval call can't double-process the same
      // order (approving a PO never touches inventory either way, but a
      // duplicate approval is still worth ruling out for consistency).
      const order = await PurchaseOrder.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { status: 'approved' },
        { new: true }
      );

      if (!order) {
        const existing = await PurchaseOrder.findById(id);
        if (!existing) {
          return NextResponse.json(
            { success: false, error: 'Purchase order not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { success: false, error: `Cannot approve an order with status "${existing.status}"` },
          { status: 400 }
        );
      }

      logActivity({
        action: 'PURCHASE_ORDER_APPROVED',
        description: `${user.name || 'Unknown'} approved purchase order ${order.orderNumber}`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'info',
      });

      return NextResponse.json({
        success: true,
        data: {
          ...order.toObject(),
          _id: order._id.toString(),
          id: order._id.toString(),
        },
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
