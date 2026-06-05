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

  private get exporterEndpoint(): string {
    return (
      process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318/v1/traces'
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log(
        'OpenTelemetry is disabled. Set OTEL_ENABLED=true to enable.',
      );
      return;
    }

    this.logger.log('OpenTelemetry is enabled. Bootstrapping tracing...');
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
    const { getNodeAutoInstrumentations } =
      await import('@opentelemetry/auto-instrumentations-node');
    const { NestInstrumentation } =
      await import('@opentelemetry/instrumentation-nestjs-core');

    const sdk = new NodeSDK({
      serviceName: this.serviceName,
      traceExporter: new JaegerExporter({
        endpoint: this.exporterEndpoint,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) =>
              ['/health', '/health/live', '/health/ready'].includes(
                req.url ?? '',
              ),
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
        }),
        new NestInstrumentation(),
      ],
    });

    process.on('SIGTERM', () => {
      sdk.shutdown().catch(() => {});
    });

    await sdk.start();
    this.logger.log('OpenTelemetry tracing started.');
  }
}
