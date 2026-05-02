import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { CreateTaskSchema } from '@/lib/validators';
import { readSession } from '@/lib/session';
import { mutationLimiter, ipFromHeaders } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ tasks: store.listTasks() });
}

export async function POST(req: NextRequest) {
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

  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const task = store.createTask({
    text: parsed.data.text,
    priority: parsed.data.priority,
    createdBy: session.name,
  });
  logger.info('task.created', { taskId: task.id, by: session.name, priority: task.priority });
  return NextResponse.json({ task }, { status: 201 });
}
