import { Global, Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [TelemetryService, MetricsService],
  exports: [TelemetryService, MetricsService],
})
export class TelemetryModule {}
