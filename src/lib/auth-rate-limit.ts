/**
 * Optimized in-memory rate limiting for authentication
 * Much faster than file-based storage for better login performance
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limits
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup interval to prevent memory leaks
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [email, record] of rateLimitStore.entries()) {
      if (now >= record.resetTime) {
        rateLimitStore.delete(email);
      }
    }
  }, 5 * 60 * 1000); // Cleanup every 5 minutes

  // Don't let this background timer keep the process (or a test run) alive.
  cleanupInterval.unref?.();
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanup();
}

export function checkRateLimit(email: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(email);
  
  if (record && now < record.resetTime && record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  
  if (!record || now >= record.resetTime) {
    rateLimitStore.set(email, {
      count: 1,
      resetTime: now + windowMs
    });
  } else {
    record.count++;
  }
  
  const currentRecord = rateLimitStore.get(email)!;
  
  return {
    allowed: true,
    remaining: maxAttempts - currentRecord.count,
    resetTime: currentRecord.resetTime
  };
}

export function resetRateLimit(email: string) {
  rateLimitStore.delete(email);
}

export function getRateLimitStatus(email: string): { count: number; resetTime: number } | null {
  const record = rateLimitStore.get(email);
  const now = Date.now();
  
  if (record && now < record.resetTime) {
    return record;
  }
  
  return null;
}
