/**
 * Sentry wiring for the pluggable monitoring sink (web only for now — the
 * mobile milestone will add @sentry/react-native and register the same sink).
 *
 * Behavior:
 *   - No-op unless EXPO_PUBLIC_SENTRY_DSN is set, so local dev and forks
 *     without a Sentry account keep the console dev-sink from monitoring.ts.
 *   - The SDK loads as an async chunk, so it adds nothing to the initial
 *     bundle when monitoring is disabled.
 */

import { Platform } from 'react-native'
import { registerMonitoringSink } from './monitoring'

export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn || Platform.OS !== 'web') return

  void import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: __DEV__ ? 'development' : 'production',
        // Errors only for now — tracing/replay can be enabled later once
        // there's a perf budget conversation to go with them.
        tracesSampleRate: 0,
      })
      registerMonitoringSink({
        captureException: (error, context) =>
          Sentry.captureException(error, context ? { extra: context } : undefined),
        captureMessage: (message, context) =>
          Sentry.captureMessage(message, context ? { extra: context } : undefined),
      })
    })
    .catch(() => {
      // Monitoring must never break the app — stay on the default sink
    })
}
