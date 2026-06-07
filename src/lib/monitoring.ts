/**
 * Pluggable monitoring sink.
 *
 * Apps register a sink at startup; ErrorBoundary and other surfaces call
 * captureException() / captureMessage() without knowing the backend.
 *
 * Default sink is a no-op in production and a console logger in __DEV__,
 * so removing the registration never silently drops dev errors.
 *
 * To wire Sentry later, call registerMonitoringSink({ captureException, captureMessage })
 * in src/app/_layout.tsx after Sentry.init().
 */

export interface MonitoringSink {
  captureException: (error: unknown, context?: Record<string, unknown>) => void
  captureMessage: (message: string, context?: Record<string, unknown>) => void
}

const devSink: MonitoringSink = {
  captureException: (error, context) => {
    if (__DEV__) console.error('[monitoring]', error, context)
  },
  captureMessage: (message, context) => {
    if (__DEV__) console.warn('[monitoring]', message, context)
  },
}

let sink: MonitoringSink = devSink

export function registerMonitoringSink(next: MonitoringSink): void {
  sink = next
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    sink.captureException(error, context)
  } catch {
    // Never let the monitoring layer crash the app
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  try {
    sink.captureMessage(message, context)
  } catch {
    // Never let the monitoring layer crash the app
  }
}
