import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { QueueHealthIndicatorService } from './queue-health-indicator.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [QueueHealthIndicatorService],
})
export class HealthModule {}
