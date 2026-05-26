import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogService } from './application/services/audit-log.service';
import { AdminAuditLogController } from './infrastructure/http/controllers/admin-audit-log.controller';
import { AuditLogTypeOrmRepository } from './infrastructure/repositories/audit-log-typeorm.repository';
import { AuditLogTypeOrmEntity } from './infrastructure/entities/audit-log-typeorm.entity';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log-repository.port';
import { AUDIT_LOG_SERVICE } from './application/ports/audit-log-service.port';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogTypeOrmEntity]), forwardRef(() => UserModule)],
  controllers: [AdminAuditLogController],
  providers: [
    {
      provide: AUDIT_LOG_SERVICE,
      useClass: AuditLogService,
    },
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogTypeOrmRepository,
    },
  ],
  exports: [AUDIT_LOG_SERVICE, AUDIT_LOG_REPOSITORY],
})
export class AuditModule {}
