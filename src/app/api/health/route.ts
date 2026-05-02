import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  const body = {
    status: 'ok' as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  logger.debug('health.check', body);
  return Response.json(body);
}
