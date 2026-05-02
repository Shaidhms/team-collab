import { cookies } from 'next/headers';

const COOKIE_NAME = 'tc_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export type SessionData = {
  name: string;
};

export async function readSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionData>;
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
  cookieStore.set(COOKIE_NAME, JSON.stringify(data), {
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
