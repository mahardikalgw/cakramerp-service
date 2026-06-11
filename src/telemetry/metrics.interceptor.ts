import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * MetricsInterceptor — records HTTP request count and duration for every
 * incoming request. Applied globally via APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      route?: { path?: string };
    }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          this.metrics.recordHttpRequest(
            req.method,
            req.route?.path ?? req.url,
            res.statusCode,
            Date.now() - start,
          );
        },
        error: (err: { status?: number }) => {
          this.metrics.recordHttpRequest(
            req.method,
            req.route?.path ?? req.url,
            err?.status ?? 500,
            Date.now() - start,
          );
        },
      }),
    );
  }
}
