import { cookies } from 'next/headers';
import { sign, verify } from '@/lib/cookie-sign';

const COOKIE_NAME = 'tc_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export type SessionData = {
  name: string;
};

export async function readSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = verify(raw);
  if (payload === null) return null;

  try {
    const parsed = JSON.parse(payload) as Partial<SessionData>;
    if (typeof parsed.name === 'string' && parsed.name.trim().length > 0) {
      return { name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSession(data: SessionData) {
  const cookieStore = cookies();
  const signed = sign(JSON.stringify(data));
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

export function clearSession() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE = COOKIE_NAME;
