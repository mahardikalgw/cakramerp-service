export { IAMModule } from './iam.module';
export {
  ROLE_SERVICE,
  type RoleServicePort,
} from './application/ports/role-service.port';
export {
  PERMISSION_SERVICE,
  type PermissionServicePort,
} from './application/ports/permission-service.port';
export { CreateRoleCommand } from './application/commands/create-role.command';
export { CreatePermissionCommand } from './application/commands/create-permission.command';
export { AssignRoleCommand } from './application/commands/assign-role.command';
export { Role } from './domain/entities/role.entity';
export { Permission } from './domain/entities/permission.entity';
export { Roles } from './infrastructure/decorators/roles.decorator';
export { Permissions } from './infrastructure/decorators/permissions.decorator';
export { RolesGuard } from './infrastructure/guards/roles.guard';
export { PermissionsGuard } from './infrastructure/guards/permissions.guard';
