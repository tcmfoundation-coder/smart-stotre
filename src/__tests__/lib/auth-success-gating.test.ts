jest.mock('next-auth/react', () => ({ signIn: jest.fn(), getSession: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/auth/AuthSuccess', () => ({ AuthSuccess: () => null }));

import { resolveAuthenticatedUser, getDisplayFirstName, getRoleAwareMessage } from '@/app/login/page';

// Regression coverage for the security rule this feature is built around:
// the success animation must NEVER appear merely because signIn() resolved
// without throwing (a CredentialsSignin error surfaces as a *resolved*
// result with error/code set, not a rejection) or because the client
// "thinks" it worked. It must depend on the session mechanism itself
// (getSession()) genuinely confirming a session with a real user id.
describe('resolveAuthenticatedUser (success-animation gate)', () => {
  it('returns null when signIn reported an error, even if a session-shaped object is passed', () => {
    const result = resolveAuthenticatedUser(
      { error: 'CredentialsSignin' },
      { user: { id: 'u1', name: 'Muktar Admin', role: 'admin' } }
    );
    expect(result).toBeNull();
  });

  it('returns null when signIn reported a totp_required/totp_invalid/rate_limited code', () => {
    for (const code of ['totp_required', 'totp_invalid', 'rate_limited']) {
      const result = resolveAuthenticatedUser(
        { code },
        { user: { id: 'u1', name: 'Muktar Admin', role: 'admin' } }
      );
      expect(result).toBeNull();
    }
  });

  it('returns null when signIn looked successful but no real session came back', () => {
    expect(resolveAuthenticatedUser({}, null)).toBeNull();
    expect(resolveAuthenticatedUser({}, {})).toBeNull();
    expect(resolveAuthenticatedUser({}, { user: {} })).toBeNull();
  });

  it('returns null when signInResult itself is missing (e.g. an unexpected exception path)', () => {
    expect(resolveAuthenticatedUser(null, { user: { id: 'u1' } })).toBeNull();
    expect(resolveAuthenticatedUser(undefined, { user: { id: 'u1' } })).toBeNull();
  });

  it('only returns a user when BOTH signIn succeeded AND the session genuinely has an id', () => {
    const result = resolveAuthenticatedUser(
      {},
      { user: { id: 'u1', name: 'Muktar Admin', role: 'admin' } }
    );
    expect(result).toEqual({ name: 'Muktar', role: 'admin' });
  });
});

describe('getDisplayFirstName', () => {
  it('takes the first token of the full name', () => {
    expect(getDisplayFirstName('Muktar Admin')).toBe('Muktar');
  });

  it('handles a single-word name', () => {
    expect(getDisplayFirstName('Muktar')).toBe('Muktar');
  });

  it('collapses extra whitespace', () => {
    expect(getDisplayFirstName('  Muktar   Admin  ')).toBe('Muktar');
  });

  it('falls back safely for an empty/missing name rather than rendering nothing', () => {
    expect(getDisplayFirstName('')).toBe('there');
    expect(getDisplayFirstName(null)).toBe('there');
    expect(getDisplayFirstName(undefined)).toBe('there');
  });
});

describe('getRoleAwareMessage', () => {
  it('gives the admin-specific message', () => {
    expect(getRoleAwareMessage('admin')).toBe("You're being redirected to your dashboard for managing your business.");
  });

  it('gives the cashier-specific message', () => {
    expect(getRoleAwareMessage('cashier')).toBe("You're being redirected to your checkout workspace.");
  });

  it('falls back to the neutral message for manager and any unrecognized/missing role', () => {
    const neutral = "You're being redirected to your dashboard.";
    expect(getRoleAwareMessage('manager')).toBe(neutral);
    expect(getRoleAwareMessage('something-unexpected')).toBe(neutral);
    expect(getRoleAwareMessage(null)).toBe(neutral);
    expect(getRoleAwareMessage(undefined)).toBe(neutral);
  });
});
