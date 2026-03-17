/**
 * Error Tracking Provider Registry
 *
 * Reads VITE_ERROR_TRACKING_PROVIDER env var and instantiates the correct provider.
 * Defaults to 'sentry' if VITE_SENTRY_DSN is set, otherwise 'console'.
 *
 * Supported values: 'sentry' | 'opentelemetry' | 'console'
 */

import type { ErrorTrackingProvider } from '../types';
import { ConsoleErrorTrackingProvider } from './console-provider';
import { SentryProvider } from './sentry-provider';
import { OpenTelemetryProvider } from './opentelemetry-provider';

let _provider: ErrorTrackingProvider | null = null;

export function getErrorTracking(): ErrorTrackingProvider {
  if (_provider) return _provider;

  const explicit = import.meta.env.VITE_ERROR_TRACKING_PROVIDER;
  const hasSentryDsn = !!import.meta.env.VITE_SENTRY_DSN;
  const hasOtelEndpoint = !!import.meta.env.VITE_OTEL_EXPORTER_ENDPOINT;
  const providerName = explicit ?? (hasSentryDsn ? 'sentry' : hasOtelEndpoint ? 'opentelemetry' : 'console');

  switch (providerName) {
    case 'sentry': {
      _provider = new SentryProvider();
      _provider.init({
        dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
        environment: import.meta.env.VITE_APP_ENV ?? 'development',
        release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
        tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1',
      });
      break;
    }
    case 'opentelemetry':
    case 'otel': {
      _provider = new OpenTelemetryProvider();
      _provider.init({
        endpoint: import.meta.env.VITE_OTEL_EXPORTER_ENDPOINT ?? '',
        serviceName: import.meta.env.VITE_OTEL_SERVICE_NAME ?? 'fiducia-web',
        environment: import.meta.env.VITE_APP_ENV ?? 'development',
        release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
        headers: import.meta.env.VITE_OTEL_EXPORTER_HEADERS,
      });
      break;
    }
    case 'console':
    default: {
      _provider = new ConsoleErrorTrackingProvider();
      _provider.init({});
      break;
    }
  }

  return _provider;
}

export { ConsoleErrorTrackingProvider } from './console-provider';
export { SentryProvider } from './sentry-provider';
export { OpenTelemetryProvider } from './opentelemetry-provider';
