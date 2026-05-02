import { describe, it, expect } from 'vitest';
import { RateLimiter, ipFromHeaders } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  it('allows up to capacity then denies', () => {
    const rl = new RateLimiter(3, 0); // no refill
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(false);
  });

  it('isolates different keys', () => {
    const rl = new RateLimiter(1, 0);
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(false);
    expect(rl.check('b').ok).toBe(true);
  });

  it('reports retry-after when denied', () => {
    const rl = new RateLimiter(1, 1 / 1000); // 1 token per second
    expect(rl.check('k', 0).ok).toBe(true);
    const denied = rl.check('k', 0);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills tokens over time', () => {
    const rl = new RateLimiter(1, 1 / 1000); // 1 per second
    expect(rl.check('k', 0).ok).toBe(true);
    expect(rl.check('k', 100).ok).toBe(false);
    expect(rl.check('k', 1100).ok).toBe(true);
  });
});

describe('ipFromHeaders', () => {
  it('reads first IP from x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(ipFromHeaders(h)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const h = new Headers({ 'x-real-ip': '9.9.9.9' });
    expect(ipFromHeaders(h)).toBe('9.9.9.9');
  });

  it('returns "unknown" when no ip header is present', () => {
    expect(ipFromHeaders(new Headers())).toBe('unknown');
  });
});
