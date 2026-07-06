import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { envConfig } from '../config/env.config';
import { GlPostingProcessor } from './gl-posting.processor';
import { AuditLogProcessor } from './audit-log.processor';
import { NotificationProcessor } from './notification.processor';
import { PayrollProcessor } from './payroll.processor';
import { GL_POSTING_QUEUE_NAME } from './gl-posting.constants';
import {
  AUDIT_LOG_QUEUE_NAME,
  NOTIFICATION_QUEUE_NAME,
} from './audit-log.constants';
import { PAYROLL_QUEUE_NAME } from './payroll.constants';
import { QueueHealthService } from './queue-health.service';
import { AuditModule } from '../modules/audit/audit.module';
import { HrModule } from '../modules/hr/hr.module';

const redisUrl = envConfig.redis?.url;
const connection = redisUrl
  ? { url: redisUrl }
  : {
      host: envConfig.redis?.host || 'localhost',
      port: envConfig.redis?.port || 6379,
      ...(envConfig.redis?.password
        ? { password: envConfig.redis.password }
        : {}),
    };

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({ connection }),
    }),
    BullModule.registerQueue(
      { name: GL_POSTING_QUEUE_NAME },
      { name: AUDIT_LOG_QUEUE_NAME },
      { name: NOTIFICATION_QUEUE_NAME },
      { name: PAYROLL_QUEUE_NAME },
    ),
    AuditModule,
    HrModule,
  ],
  providers: [
    GlPostingProcessor,
    AuditLogProcessor,
    NotificationProcessor,
    PayrollProcessor,
    QueueHealthService,
  ],
  exports: [BullModule, QueueHealthService],
})
export class QueueModule {}
