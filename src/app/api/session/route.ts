import { NextRequest, NextResponse } from 'next/server';
import { SetSessionSchema } from '@/lib/validators';
import { readSession, writeSession, clearSession } from '@/lib/session';
import { mutationLimiter, ipFromHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await readSession();
  return NextResponse.json({ session });
}

export async function POST(req: NextRequest) {
  const ip = ipFromHeaders(req.headers);
  const limit = mutationLimiter.check(`session:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SetSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  writeSession({ name: parsed.data.name });
  logger.info('session.joined', { name: parsed.data.name });
  return NextResponse.json({ session: { name: parsed.data.name } });
}

export async function DELETE() {
  clearSession();
  return NextResponse.json({ ok: true });
}
