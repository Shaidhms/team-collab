/**
 * In-memory token-bucket limiter keyed by an opaque string (e.g. IP).
 * Suitable for single-instance Cloud Run deployments. For multi-instance
 * scale, swap with Upstash / Memorystore.
 */

type Bucket = { tokens: number; updatedAt: number };

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    const elapsed = Math.max(0, now - bucket.updatedAt);
    const refilled = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerMs);

    if (refilled < 1) {
      const tokensNeeded = 1 - refilled;
      const retryAfterMs = Math.ceil(tokensNeeded / this.refillPerMs);
      this.buckets.set(key, { tokens: refilled, updatedAt: now });
      return { ok: false, remaining: 0, retryAfterMs };
    }

    const next = { tokens: refilled - 1, updatedAt: now };
    this.buckets.set(key, next);
    return { ok: true, remaining: Math.floor(next.tokens), retryAfterMs: 0 };
  }

  reset(): void {
    this.buckets.clear();
  }
}

// Default: 30 mutations per minute per IP.
export const mutationLimiter = new RateLimiter(30, 30 / 60_000);

export function ipFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? 'unknown';
}
