/**
 * Structured logger that emits Google Cloud Logging-compatible JSON on a single
 * stdout line. Cloud Run captures stdout into Cloud Logging automatically; the
 * `severity` and `message` keys map to LogEntry fields.
 *
 * Falls back to readable console output in dev.
 *
 * Reference: https://cloud.google.com/run/docs/logging#using-json
 */

type Severity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

type Fields = Record<string, unknown>;

const isProd = process.env.NODE_ENV === 'production';

function emit(severity: Severity, message: string, fields?: Fields) {
  if (!isProd) {
    const tag = severity === 'INFO' ? 'info' : severity.toLowerCase();

    // eslint-disable-next-line no-console
    console[severity === 'ERROR' || severity === 'CRITICAL' ? 'error' : 'warn'](
      `[${tag}] ${message}`,
      fields ?? '',
    );
    return;
  }

  const entry: Record<string, unknown> = {
    severity,
    message,
    time: new Date().toISOString(),
    ...fields,
  };

  // One JSON object per line is what Cloud Logging expects.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, fields?: Fields) => emit('DEBUG', message, fields),
  info: (message: string, fields?: Fields) => emit('INFO', message, fields),
  warn: (message: string, fields?: Fields) => emit('WARNING', message, fields),
  error: (message: string, fields?: Fields) => emit('ERROR', message, fields),
};
