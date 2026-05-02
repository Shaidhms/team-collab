import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { UpdateTaskSchema } from '@/lib/validators';
import { readSession } from '@/lib/session';
import { mutationLimiter, ipFromHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Join with a display name first' }, { status: 401 });
  }

  const ip = ipFromHeaders(req.headers);
  const limit = mutationLimiter.check(`tasks:${ip}`);
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

  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const task = await store.updateTask(params.id, parsed.data, session.name);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  logger.info('task.updated', { taskId: task.id, by: session.name });
  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Join with a display name first' }, { status: 401 });
  }

  const ip = ipFromHeaders(req.headers);
  const limit = mutationLimiter.check(`tasks:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  const ok = await store.deleteTask(params.id, session.name);
  if (!ok) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  logger.info('task.deleted', { taskId: params.id, by: session.name });
  return NextResponse.json({ ok: true });
}
