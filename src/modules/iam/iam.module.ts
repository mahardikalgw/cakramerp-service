import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './application/services/role.service';
import { PermissionService } from './application/services/permission.service';
import { IAMController } from './infrastructure/http/controllers/iam.controller';
import { RoleTypeOrmRepository } from './infrastructure/repositories/role-typeorm.repository';
import { PermissionTypeOrmRepository } from './infrastructure/repositories/permission-typeorm.repository';
import { RoleTypeOrmEntity } from './infrastructure/entities/role-typeorm.entity';
import { PermissionTypeOrmEntity } from './infrastructure/entities/permission-typeorm.entity';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { PermissionsGuard } from './infrastructure/guards/permissions.guard';
import { ROLE_REPOSITORY } from './domain/repositories/role-repository.port';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission-repository.port';
import { ROLE_SERVICE } from './application/ports/role-service.port';
import { PERMISSION_SERVICE } from './application/ports/permission-service.port';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleTypeOrmEntity, PermissionTypeOrmEntity]),
    UserModule,
    AuthModule,
  ],
  controllers: [IAMController],
  providers: [
    RolesGuard,
    PermissionsGuard,
    {
      provide: ROLE_SERVICE,
      useClass: RoleService,
    },
    {
      provide: PERMISSION_SERVICE,
      useClass: PermissionService,
    },
    {
      provide: ROLE_REPOSITORY,
      useClass: RoleTypeOrmRepository,
    },
    {
      provide: PERMISSION_REPOSITORY,
      useClass: PermissionTypeOrmRepository,
    },
  ],
  exports: [ROLE_SERVICE, PERMISSION_SERVICE, RolesGuard, PermissionsGuard],
})
export class IAMModule {}
