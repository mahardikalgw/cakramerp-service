/**
 * traceContextMixin — pino mixin that injects the active OpenTelemetry
 * trace_id and span_id into every log entry.
 *
 * When OTel is disabled or there is no active span the function returns
 * an empty object so logs are unaffected.
 */
export function traceContextMixin(): Record<string, string> {
  if (process.env.OTEL_ENABLED !== 'true') return {};

  try {
    // Avoid a hard import — OTel API may not yet be initialised during
    // early boot. Require at call-time.

    const { trace } =
      require('@opentelemetry/api') as typeof import('@opentelemetry/api');
    const span = trace.getActiveSpan();
    if (!span || !span.isRecording()) return {};
    const ctx = span.spanContext();
    return {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
    };
  } catch {
    return {};
  }
}
