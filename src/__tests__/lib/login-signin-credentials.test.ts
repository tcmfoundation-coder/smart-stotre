// Importing the page module (to reach its exported pure helper) also
// executes its top-level imports; next-auth/react ships ESM that Jest can't
// parse directly, so it - and the other client-only modules this page
// imports - need the same mocking the rest of this repo's page-level tests
// already use (see reports-page-view-action.test.ts).
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

import { buildSignInCredentials } from '@/app/login/page';

// Regression test for a real lockout: a 2FA-enabled account could never log
// in. next-auth/react's signIn() serializes its options with
// URLSearchParams, which stringifies an `undefined` value to the literal
// text "undefined" rather than omitting the key. The login page used to
// pass `totpCode: needsTotp ? totpCode : undefined`, so the very first
// submit (before needsTotp is ever true) sent credentials.totpCode ===
// "undefined" - a truthy, non-empty string - to authorize(), which skipped
// the "no code yet, ask for one" branch entirely and treated it as a wrong
// code instead. The fix must omit the key, not set it to undefined.
describe('buildSignInCredentials', () => {
  it('omits totpCode entirely on the first submit (needsTotp false)', () => {
    const payload = buildSignInCredentials('admin@smartmart.com', 'hunter2', false, '');
    expect('totpCode' in payload).toBe(false);
  });

  it('omits totpCode even if stale state happens to hold a value', () => {
    // Guards against a future regression that reads totpCode unconditionally.
    const payload = buildSignInCredentials('admin@smartmart.com', 'hunter2', false, '123456');
    expect('totpCode' in payload).toBe(false);
  });

  it('includes the real code once needsTotp is true', () => {
    const payload = buildSignInCredentials('admin@smartmart.com', 'hunter2', true, '123456');
    expect(payload.totpCode).toBe('123456');
  });

  it('produces a URLSearchParams body with no totpCode param when omitted - the actual failure mode', () => {
    const payload = buildSignInCredentials('admin@smartmart.com', 'hunter2', false, '');
    const body = new URLSearchParams(payload as Record<string, string>);
    expect(body.has('totpCode')).toBe(false);
    expect(body.toString()).not.toContain('totpCode=undefined');
  });

  it('produces a URLSearchParams body carrying the real code when needsTotp is true', () => {
    const payload = buildSignInCredentials('admin@smartmart.com', 'hunter2', true, '654321');
    const body = new URLSearchParams(payload as Record<string, string>);
    expect(body.get('totpCode')).toBe('654321');
  });
});
