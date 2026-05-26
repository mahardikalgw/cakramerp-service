import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './application/services/user.service';
import { UserController } from './infrastructure/http/controllers/user.controller';
import { UserTypeOrmRepository } from './infrastructure/repositories/user-typeorm.repository';
import { UserTypeOrmEntity } from './infrastructure/entities/user-typeorm.entity';
import { UserIdentityAdapter } from './infrastructure/adapters/user-identity.adapter';
import { UserRoleAssignerAdapter } from './infrastructure/adapters/user-role-assigner.adapter';
import { USER_REPOSITORY } from './domain/repositories/user-repository.port';
import { USER_SERVICE } from './application/ports/user-service.port';
import { USER_IDENTITY_PORT } from '../../shared/kernel/domain/ports/user-identity.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../shared/kernel/domain/ports/user-role-assigner.port';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserTypeOrmEntity]), forwardRef(() => AuditModule)],
  controllers: [UserController],
  providers: [
    {
      provide: USER_SERVICE,
      useClass: UserService,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserTypeOrmRepository,
    },
    {
      provide: USER_IDENTITY_PORT,
      useClass: UserIdentityAdapter,
    },
    {
      provide: USER_ROLE_ASSIGNER_PORT,
      useClass: UserRoleAssignerAdapter,
    },
  ],
  exports: [
    USER_SERVICE,
    USER_REPOSITORY,
    USER_IDENTITY_PORT,
    USER_ROLE_ASSIGNER_PORT,
  ],
})
export class UserModule {}
