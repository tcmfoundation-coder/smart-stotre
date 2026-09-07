import { NextResponse } from 'next/server';

// This route file exists but has never had an implementation (empty since
// commit 4e6c388) and nothing in the app links to it. Returning 501 keeps
// it a valid module for Next.js's route type-checking instead of silently
// deleting an endpoint someone may still intend to build.
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Not implemented' },
    { status: 501 }
  );
}
