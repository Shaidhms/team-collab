import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sign, verify, hasSessionSecret } from '@/lib/cookie-sign';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;
const TEST_SECRET = 'test-secret-do-not-use-in-prod';

describe('cookie-sign', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = ORIGINAL_SECRET;
    }
  });

  it('round-trips a simple ASCII string', () => {
    const signed = sign('hello');
    expect(verify(signed)).toBe('hello');
  });

  it('round-trips an empty string', () => {
    const signed = sign('');
    expect(verify(signed)).toBe('');
  });

  it('round-trips a multi-byte UTF-8 string', () => {
    const original = 'María 王 ✨';
    const signed = sign(original);
    expect(verify(signed)).toBe(original);
  });

  it('round-trips a JSON payload (the production use case)', () => {
    const original = JSON.stringify({ name: 'Shaid', extra: 'value.with.dots' });
    const signed = sign(original);
    expect(verify(signed)).toBe(original);
  });

  it('returns null for unsigned input (no signature suffix)', () => {
    expect(verify('hello')).toBeNull();
  });

  it('returns null when payload is tampered with', () => {
    const signed = sign('hello world');
    const dotIdx = signed.lastIndexOf('.');
    // Flip a character in the encoded payload portion.
    const payloadPart = signed.slice(0, dotIdx);
    const sigPart = signed.slice(dotIdx);
    const flippedChar = payloadPart[0] === 'a' ? 'b' : 'a';
    const tampered = flippedChar + payloadPart.slice(1) + sigPart;
    expect(verify(tampered)).toBeNull();
  });

  it('returns null when signature is tampered with', () => {
    const signed = sign('hello world');
    const dotIdx = signed.lastIndexOf('.');
    const payloadPart = signed.slice(0, dotIdx + 1);
    const sigPart = signed.slice(dotIdx + 1);
    const flippedChar = sigPart[0] === 'A' ? 'B' : 'A';
    const tampered = payloadPart + flippedChar + sigPart.slice(1);
    expect(verify(tampered)).toBeNull();
  });

  it('returns null for a wrong-length signature (sig too short)', () => {
    const signed = sign('hello');
    const dotIdx = signed.lastIndexOf('.');
    const truncated = signed.slice(0, dotIdx + 3); // payload + dot + 2 sig chars
    expect(verify(truncated)).toBeNull();
  });

  it('returns null when the dot separator is missing', () => {
    expect(verify('justpayloadnodot')).toBeNull();
  });

  it('returns null for empty string input', () => {
    expect(verify('')).toBeNull();
  });

  it('returns null for a value signed under a different secret', () => {
    const signed = sign('hello');
    process.env.SESSION_SECRET = 'a-completely-different-secret';
    expect(verify(signed)).toBeNull();
  });

  it('throws when SESSION_SECRET is unset on sign', () => {
    delete process.env.SESSION_SECRET;
    expect(() => sign('hello')).toThrow(/SESSION_SECRET/);
  });

  it('verify returns null when SESSION_SECRET is unset', () => {
    const signed = sign('hello');
    delete process.env.SESSION_SECRET;
    expect(verify(signed)).toBeNull();
  });

  it('hasSessionSecret reflects env state', () => {
    expect(hasSessionSecret()).toBe(true);
    delete process.env.SESSION_SECRET;
    expect(hasSessionSecret()).toBe(false);
    process.env.SESSION_SECRET = '';
    expect(hasSessionSecret()).toBe(false);
  });

  it('produces different signatures for different payloads', () => {
    const a = sign('payload-a');
    const b = sign('payload-b');
    expect(a).not.toBe(b);
  });

  it('produces a stable signature for the same payload + secret', () => {
    const a = sign('stable');
    const b = sign('stable');
    expect(a).toBe(b);
  });
});
