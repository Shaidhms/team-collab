import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 signed cookie payloads.
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 *
 * The payload is base64url-encoded so it can safely contain JSON, dots,
 * or any other characters. The signature is computed over the *encoded*
 * payload string, so verification doesn't have to re-encode.
 *
 * No external deps — pure `node:crypto`.
 */

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with `openssl rand -base64 48` and set it in your environment.',
    );
  }
  return secret;
}

function hmac(secret: string, encodedPayload: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest();
}

export function hasSessionSecret(): boolean {
  const secret = process.env.SESSION_SECRET;
  return typeof secret === 'string' && secret.length > 0;
}

export function sign(payload: string): string {
  const secret = getSecret();
  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = hmac(secret, encodedPayload).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verify(signed: string): string | null {
  if (!hasSessionSecret()) return null;
  if (typeof signed !== 'string' || signed.length === 0) return null;

  // Split on the LAST dot — payload is base64url so it cannot contain a dot,
  // but using lastIndexOf is defensive in case the format ever evolves.
  const lastDot = signed.lastIndexOf('.');
  if (lastDot < 0 || lastDot === signed.length - 1) return null;

  const encodedPayload = signed.slice(0, lastDot);
  const providedSig = signed.slice(lastDot + 1);

  // Empty-payload (sign('')) is legitimate; empty signature never is.
  if (providedSig.length === 0) return null;

  let providedSigBuf: Buffer;
  try {
    providedSigBuf = Buffer.from(providedSig, 'base64url');
  } catch {
    return null;
  }

  let expectedSigBuf: Buffer;
  try {
    const secret = getSecret();
    expectedSigBuf = hmac(secret, encodedPayload);
  } catch {
    return null;
  }

  // timingSafeEqual throws if the buffers differ in length; guard with try/catch.
  let equal = false;
  try {
    if (providedSigBuf.length !== expectedSigBuf.length) return null;
    equal = timingSafeEqual(providedSigBuf, expectedSigBuf);
  } catch {
    return null;
  }
  if (!equal) return null;

  try {
    return Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}
