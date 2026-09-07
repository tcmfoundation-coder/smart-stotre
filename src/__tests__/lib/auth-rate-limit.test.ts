import { checkRateLimit, resetRateLimit, getRateLimitStatus } from '@/lib/auth-rate-limit';

// auth-rate-limit.ts keeps its state in an in-memory Map (not the filesystem -
// that's a different module, lib/rate-limit.ts). These tests drive the real
// store directly, resetting the emails they use between tests so state from
// one test can't leak into the next.

describe('auth-rate-limit', () => {
  const email = 'user@test.com';
  const otherEmail = 'other@test.com';

  beforeEach(() => {
    resetRateLimit(email);
    resetRateLimit(otherEmail);
    jest.restoreAllMocks();
  });

  describe('checkRateLimit', () => {
    it('allows the first request for an email', () => {
      const result = checkRateLimit(email, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('blocks when max attempts exceeded', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email, 5, 60000);
      }

      const result = checkRateLimit(email, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('allows request when window has expired', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email, 5, 60000);
      }
      expect(checkRateLimit(email, 5, 60000).allowed).toBe(false);

      nowSpy.mockReturnValue(1_000_000 + 60000 + 1);
      const result = checkRateLimit(email, 5, 60000);
      expect(result.allowed).toBe(true);
    });

    it('increments count for existing non-expired record below limit', () => {
      checkRateLimit(email, 5, 60000);
      checkRateLimit(email, 5, 60000);

      const result = checkRateLimit(email, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 5 - 3
    });

    it('uses default max attempts of 5', () => {
      const result = checkRateLimit(email);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('resetRateLimit', () => {
    it('removes the rate limit entry for an email', () => {
      checkRateLimit(email, 5, 60000);
      checkRateLimit(otherEmail, 5, 60000);

      resetRateLimit(email);

      expect(getRateLimitStatus(email)).toBeNull();
      expect(getRateLimitStatus(otherEmail)).not.toBeNull();
    });
  });

  describe('getRateLimitStatus', () => {
    it('returns status for active rate limit', () => {
      checkRateLimit(email, 5, 60000);
      checkRateLimit(email, 5, 60000);
      checkRateLimit(email, 5, 60000);

      const status = getRateLimitStatus(email);
      expect(status).not.toBeNull();
      expect(status!.count).toBe(3);
    });

    it('returns null for expired entry', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
      checkRateLimit(email, 5, 60000);

      nowSpy.mockReturnValue(2_000_000 + 60000 + 1);
      const status = getRateLimitStatus(email);
      expect(status).toBeNull();
    });

    it('returns null for unknown email', () => {
      const status = getRateLimitStatus('unknown@test.com');
      expect(status).toBeNull();
    });
  });
});
