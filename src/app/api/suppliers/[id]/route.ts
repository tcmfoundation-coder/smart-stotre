import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/actions/suppliers';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async () => {
    try {
      const supplier = await getSupplierById(id);
      if (!supplier) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: supplier });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    }
  })(request);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async () => {
    try {
      const data = await request.json();
      const supplier = await updateSupplier(id, data);
      if (!supplier) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: supplier });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    }
  })(request);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async () => {
    try {
      await deleteSupplier(id);
      return NextResponse.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    }
  })(request);
}
