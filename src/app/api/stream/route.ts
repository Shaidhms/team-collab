import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { readSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return new Response('Join with a display name first', { status: 401 });
  }

  const presenceId = globalThis.crypto.randomUUID();
  const encoder = new TextEncoder();

  // Fetch initial state up-front so the stream `start` callback can stay sync.
  const initialTasks = await store.listTasks();
  const initialPresence = store.listPresence();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client gone — cleanup will fire via abort handler.
        }
      };

      // Initial snapshot.
      send('snapshot', { tasks: initialTasks, presence: initialPresence });

      // Register presence after snapshot so the joining user appears in the
      // broadcast presence:joined event to peers, not duplicated in their own snapshot.
      store.addPresence({ id: presenceId, name: session.name });
      logger.info('presence.joined', { presenceId, name: session.name });

      const unsubscribe = store.subscribe((evt) => {
        send('change', evt);
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // ignore
        }
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        store.removePresence(presenceId);
        logger.info('presence.left', { presenceId, name: session.name });
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
