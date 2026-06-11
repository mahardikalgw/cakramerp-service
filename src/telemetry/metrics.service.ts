import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import type { Meter, Counter, Histogram } from '@opentelemetry/api';

/**
 * MetricsService — thin façade over the OpenTelemetry MeterProvider.
 *
 * Uses lazy initialisation: instruments are created on the first call to
 * `getMeter()` (i.e. after the NodeSDK has started in TelemetryService).
 * When OTEL_ENABLED is false the methods are no-ops.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private meter: Meter | null = null;

  // ── HTTP ────────────────────────────────────────────────────────────────
  private httpRequestTotal: Counter | null = null;
  private httpRequestDuration: Histogram | null = null;

  // ── Auth ────────────────────────────────────────────────────────────────
  private authLoginTotal: Counter | null = null;

  // ── Document generation ─────────────────────────────────────────────────
  private docGenTotal: Counter | null = null;
  private docGenDuration: Histogram | null = null;

  // ── Queue ───────────────────────────────────────────────────────────────
  private queueJobTotal: Counter | null = null;
  private queueJobDuration: Histogram | null = null;

  // ── Lab ─────────────────────────────────────────────────────────────────
  private labTestingRequestTotal: Counter | null = null;

  onModuleInit(): void {
    if (process.env.OTEL_ENABLED !== 'true') return;

    // @opentelemetry/api is available globally once NodeSDK.start() has run.
    // We import synchronously here because this runs after TelemetryService.

    const { metrics } =
      require('@opentelemetry/api') as typeof import('@opentelemetry/api');
    this.meter = metrics.getMeter('cakramerp-service', '1.0.0');
    this.initInstruments();
    this.logger.log('Metrics instruments initialised.');
  }

  private initInstruments(): void {
    if (!this.meter) return;

    this.httpRequestTotal = this.meter.createCounter(
      'http.server.request.total',
      {
        description: 'Total HTTP requests',
      },
    );
    this.httpRequestDuration = this.meter.createHistogram(
      'http.server.duration',
      {
        description: 'HTTP server request duration (ms)',
        unit: 'ms',
      },
    );
    this.authLoginTotal = this.meter.createCounter('auth.login.total', {
      description: 'Total login attempts',
    });
    this.docGenTotal = this.meter.createCounter('document.generation.total', {
      description: 'Total document generation requests',
    });
    this.docGenDuration = this.meter.createHistogram(
      'document.generation.duration',
      {
        description: 'Document generation end-to-end duration (ms)',
        unit: 'ms',
      },
    );
    this.queueJobTotal = this.meter.createCounter('queue.job.total', {
      description: 'Total queue jobs processed',
    });
    this.queueJobDuration = this.meter.createHistogram('queue.job.duration', {
      description: 'Queue job processing duration (ms)',
      unit: 'ms',
    });
    this.labTestingRequestTotal = this.meter.createCounter(
      'lab.testing_request.total',
      { description: 'Total lab testing requests created' },
    );
  }

  // ── HTTP ────────────────────────────────────────────────────────────────

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const attrs = { method, route, status_code: String(statusCode) };
    this.httpRequestTotal?.add(1, attrs);
    this.httpRequestDuration?.record(durationMs, attrs);
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  recordAuthLogin(status: 'success' | 'failure'): void {
    this.authLoginTotal?.add(1, { status });
  }

  // ── Document generation ─────────────────────────────────────────────────

  recordDocumentGeneration(
    documentType: string,
    outputFormat: string,
    status: 'requested' | 'completed' | 'failed',
    durationMs?: number,
  ): void {
    const attrs = { document_type: documentType, format: outputFormat, status };
    this.docGenTotal?.add(1, attrs);
    if (durationMs !== undefined) {
      this.docGenDuration?.record(durationMs, attrs);
    }
  }

  // ── Queue ───────────────────────────────────────────────────────────────

  recordQueueJob(
    queue: string,
    status: 'completed' | 'failed',
    durationMs: number,
  ): void {
    const attrs = { queue, status };
    this.queueJobTotal?.add(1, attrs);
    this.queueJobDuration?.record(durationMs, attrs);
  }

  // ── Lab ─────────────────────────────────────────────────────────────────

  recordLabTestingRequest(status: string): void {
    this.labTestingRequestTotal?.add(1, { status });
  }
}
