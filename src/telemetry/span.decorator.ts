import { Logger } from '@nestjs/common';

/**
 * @WithSpan(name?, attributes?) — method decorator that wraps the decorated
 * method in an OpenTelemetry child span.
 *
 * Usage:
 *   @WithSpan('auth.login')
 *   async login(cmd: LoginCommand) { ... }
 *
 * When OTEL_ENABLED is false the decorator is a transparent pass-through.
 */
export function WithSpan(
  spanName?: string,
  attributes?: Record<string, string | number | boolean>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    const name =
      spanName ?? `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      if (process.env.OTEL_ENABLED !== 'true') {
        return original.apply(this, args);
      }

      const logger = new Logger('WithSpan');
      try {
        const { trace, SpanStatusCode } =
          require('@opentelemetry/api') as typeof import('@opentelemetry/api');
        const tracer = trace.getTracer('cakramerp-service');

        return await tracer.startActiveSpan(name, async (span) => {
          if (attributes) {
            span.setAttributes(attributes);
          }
          try {
            const result = await original.apply(this, args);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (err) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: err instanceof Error ? err.message : String(err),
            });
            span.recordException(err as Error);
            throw err;
          } finally {
            span.end();
          }
        });
      } catch (err) {
        // If OTel API is not available yet, fall through
        logger.warn(
          `WithSpan(${name}): OTel API unavailable, running without span.`,
        );
        return original.apply(this, args);
      }
    };

    return descriptor;
  };
}
