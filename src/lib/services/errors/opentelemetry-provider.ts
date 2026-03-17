/**
 * OpenTelemetry Error Tracking Provider
 *
 * Implements the ErrorTrackingProvider interface using the OpenTelemetry (OTel)
 * standard. This vendor-agnostic approach allows sending traces, spans, and
 * error data to any OTel-compatible backend (Datadog, Honeycomb, New Relic,
 * Grafana Tempo, Jaeger, etc.) without writing provider-specific code.
 *
 * Config:
 *   VITE_OTEL_EXPORTER_ENDPOINT — OTel collector/exporter endpoint URL
 *   VITE_OTEL_SERVICE_NAME      — Service name for traces (default: 'fiducia-web')
 *   VITE_OTEL_EXPORTER_HEADERS  — Optional JSON string of headers for auth
 *
 * Install:
 *   npm install @opentelemetry/api @opentelemetry/sdk-trace-web \
 *     @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources \
 *     @opentelemetry/semantic-conventions
 */

import type { ErrorTrackingProvider, ErrorUser, Breadcrumb, ErrorSeverity } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OTelApi = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OTelTracer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OTelTracerProvider = any;

export class OpenTelemetryProvider implements ErrorTrackingProvider {
  readonly name = 'opentelemetry';
  private api: OTelApi | null = null;
  private tracer: OTelTracer | null = null;
  private provider: OTelTracerProvider | null = null;
  private tags: Record<string, string> = {};
  private extras: Record<string, unknown> = {};
  private breadcrumbs: Breadcrumb[] = [];
  private user: ErrorUser | null = null;

  init(config: Record<string, unknown>): void {
    const endpoint = config.endpoint as string;
    if (!endpoint) {
      console.warn('[OTel] No exporter endpoint provided. OpenTelemetry is disabled.');
      return;
    }

    try {
      // Dynamic imports to avoid bundling when not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const api = require('@opentelemetry/api');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WebTracerProvider } = require('@opentelemetry/sdk-trace-web');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Resource } = require('@opentelemetry/resources');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-web');

      const serviceName = (config.serviceName as string) || 'fiducia-web';
      const environment = (config.environment as string) || 'development';

      // Parse optional headers (for auth to backends like Honeycomb, Datadog, etc.)
      let headers: Record<string, string> = {};
      if (config.headers) {
        try {
          headers = typeof config.headers === 'string'
            ? JSON.parse(config.headers)
            : config.headers as Record<string, string>;
        } catch {
          console.warn('[OTel] Failed to parse exporter headers');
        }
      }

      const resource = new Resource({
        'service.name': serviceName,
        'deployment.environment': environment,
        'service.version': (config.release as string) || 'unknown',
      });

      const exporter = new OTLPTraceExporter({
        url: endpoint,
        headers,
      });

      const tracerProvider = new WebTracerProvider({ resource });
      tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
      tracerProvider.register();

      this.api = api;
      this.tracer = api.trace.getTracer(serviceName);
      this.provider = tracerProvider;

      // eslint-disable-next-line no-console
      console.debug(`[OTel] Initialized (service=${serviceName}, env=${environment}, endpoint=${endpoint})`);
    } catch (error) {
      console.warn('[OTel] OpenTelemetry packages not installed. Run: npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions');
      console.warn('[OTel] Init error:', error);
    }
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!this.tracer || !this.api) return;

    const span = this.tracer.startSpan('exception', {
      attributes: {
        'exception.type': error instanceof Error ? error.constructor.name : typeof error,
        'exception.message': error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { 'exception.stacktrace': error.stack } : {}),
        ...this.flattenAttributes('context', context),
        ...this.flattenAttributes('tags', this.tags),
        ...(this.user?.id ? { 'enduser.id': this.user.id } : {}),
      },
    });

    span.setStatus({ code: this.api.SpanStatusCode.ERROR, message: String(error) });
    span.recordException(error instanceof Error ? error : new Error(String(error)));

    // Attach breadcrumbs as span events
    for (const bc of this.breadcrumbs) {
      span.addEvent(bc.message ?? 'breadcrumb', {
        'breadcrumb.category': bc.category ?? '',
        'breadcrumb.level': bc.level ?? 'info',
      });
    }

    span.end();
  }

  captureMessage(message: string, level: ErrorSeverity = 'info'): void {
    if (!this.tracer || !this.api) return;

    const span = this.tracer.startSpan('message', {
      attributes: {
        'message.text': message,
        'message.severity': level,
        ...this.flattenAttributes('tags', this.tags),
        ...(this.user?.id ? { 'enduser.id': this.user.id } : {}),
      },
    });

    if (level === 'error' || level === 'fatal') {
      span.setStatus({ code: this.api.SpanStatusCode.ERROR, message });
    }

    span.end();
  }

  setUser(user: ErrorUser | null): void {
    this.user = user;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  setExtra(key: string, value: unknown): void {
    this.extras[key] = value;
  }

  startTransaction(name: string, op?: string): { finish: () => void } {
    if (!this.tracer) return { finish: () => {} };

    const span = this.tracer.startSpan(name, {
      attributes: {
        'operation': op ?? 'custom',
        ...this.flattenAttributes('tags', this.tags),
        ...(this.user?.id ? { 'enduser.id': this.user.id } : {}),
      },
    });

    return {
      finish: () => span.end(),
    };
  }

  async flush(timeout = 5000): Promise<void> {
    if (!this.provider) return;
    try {
      await this.provider.forceFlush({ timeout });
    } catch {
      // Best-effort flush
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private flattenAttributes(
    prefix: string,
    obj?: Record<string, unknown>,
  ): Record<string, string> {
    if (!obj) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null) {
        result[`${prefix}.${k}`] = String(v);
      }
    }
    return result;
  }
}
