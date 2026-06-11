import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);

  private get isEnabled(): boolean {
    return process.env.OTEL_ENABLED === 'true';
  }

  private get serviceName(): string {
    return process.env.OTEL_SERVICE_NAME || 'cakramerp-service';
  }

  private get traceEndpoint(): string {
    return (
      process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318/v1/traces'
    );
  }

  private get metricsEndpoint(): string {
    // Derive metrics endpoint from trace endpoint base or use explicit env var
    const base = process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318';
    // Strip trailing path if it contains /v1/traces
    const baseUrl = base.replace('/v1/traces', '');
    return process.env.OTEL_METRICS_ENDPOINT || `${baseUrl}/v1/metrics`;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log(
        'OpenTelemetry is disabled. Set OTEL_ENABLED=true to enable.',
      );
      return;
    }

    this.logger.log(
      'OpenTelemetry is enabled. Bootstrapping tracing + metrics...',
    );

    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } =
      await import('@opentelemetry/exporter-trace-otlp-http');
    const { OTLPMetricExporter } =
      await import('@opentelemetry/exporter-metrics-otlp-http');
    const { PeriodicExportingMetricReader } =
      await import('@opentelemetry/sdk-metrics');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const {
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
      ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    } = await import('@opentelemetry/semantic-conventions');
    const { getNodeAutoInstrumentations } =
      await import('@opentelemetry/auto-instrumentations-node');
    const { NestInstrumentation } =
      await import('@opentelemetry/instrumentation-nestjs-core');
    const {
      W3CTraceContextPropagator,
      CompositePropagator,
      W3CBaggagePropagator,
    } = await import('@opentelemetry/core');

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: this.serviceName,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.0.1',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
    });

    const traceExporter = new OTLPTraceExporter({
      url: this.traceEndpoint,
    });

    const metricExporter = new OTLPMetricExporter({
      url: this.metricsEndpoint,
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 15_000,
      }),
      textMapPropagator: new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
        ],
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              const ignored = [
                '/health',
                '/health/live',
                '/health/ready',
                '/metrics',
              ];
              return ignored.includes(req.url ?? '');
            },
          },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
        new NestInstrumentation(),
      ],
    });

    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => this.logger.log('OpenTelemetry SDK shut down.'))
        .catch((err) => this.logger.error('Error shutting down OTel SDK', err));
    });

    process.on('SIGINT', () => {
      sdk
        .shutdown()
        .then(() => this.logger.log('OpenTelemetry SDK shut down.'))
        .catch((err) => this.logger.error('Error shutting down OTel SDK', err));
    });

    await sdk.start();
    this.logger.log(
      `OpenTelemetry started. Traces -> ${this.traceEndpoint}, Metrics -> ${this.metricsEndpoint}`,
    );
  }
}
