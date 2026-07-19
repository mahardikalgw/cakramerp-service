import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import type { RoleRepositoryPort } from '../../domain/repositories/role-repository.port';
import { ROLE_REPOSITORY } from '../../domain/repositories/role-repository.port';
import type { PermissionRepositoryPort } from '../../domain/repositories/permission-repository.port';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission-repository.port';
import type { UserRoleAssignerPort } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { AUDIT_LOG_SERVICE } from '../../../audit/application/ports/audit-log-service.port';
import type { AuditLogServicePort } from '../../../audit/application/ports/audit-log-service.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { CreateRoleCommand } from '../commands/create-role.command';
import { AssignRoleCommand } from '../commands/assign-role.command';
import { UpdateRoleCommand } from '../commands/update-role.command';
import { UpdateRolePermissionsCommand } from '../commands/update-role-permissions.command';
import { RoleServicePort } from '../ports/role-service.port';

@Injectable()
export class RoleService implements RoleServicePort {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepositoryPort,
    @Inject(USER_ROLE_ASSIGNER_PORT)
    private readonly userRoleAssigner: UserRoleAssignerPort,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: AuditLogServicePort,
  ) {}

  async create(command: CreateRoleCommand): Promise<Role> {
    const permissions = await Promise.all(
      command.permissionIds.map((id) => this.permissionRepository.findById(id)),
    );
    const validPermissions = permissions.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    const role = new Role({
      name: command.name,
      description: command.description,
      permissions: validPermissions,
    });

    return this.roleRepository.save(role);
  }

  async update(command: UpdateRoleCommand): Promise<Role> {
    const existing = await this.roleRepository.findById(command.id);
    if (!existing) throw new NotFoundException('Role not found');

    // Reject renaming the built-in admin role to keep the system
    // permission model stable.
    if (existing.name === 'admin' && command.name !== 'admin') {
      throw new BadRequestException(
        "The built-in 'admin' role cannot be renamed",
      );
    }

    // Check for name collision if the name is being changed.
    if (existing.name !== command.name) {
      const collision = await this.roleRepository.findByName(command.name);
      if (collision && collision.id !== command.id) {
        throw new BadRequestException(
          `A role named '${command.name}' already exists`,
        );
      }
    }

    existing.name = command.name;
    existing.description = command.description ?? '';
    const updated = await this.roleRepository.save(existing);
    return updated;
  }

  async findAll(page = 1, limit = 20): Promise<FindResult<Role>> {
    return this.roleRepository.findAll({ page, limit });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findByNameWithPermissions(name);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.roleRepository.delete(id);
    if (!deleted) throw new NotFoundException('Role not found');
  }

  async assignRolesToUser(command: AssignRoleCommand): Promise<void> {
    const roles = await Promise.all(
      command.roleIds.map((id) => this.roleRepository.findById(id)),
    );
    const validRoles = roles.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );
    if (validRoles.length !== command.roleIds.length) {
      throw new NotFoundException('Some roles not found');
    }

    await this.userRoleAssigner.assignRoles(command.userId, command.roleIds);
  }

  async updatePermissions(
    command: UpdateRolePermissionsCommand,
  ): Promise<Role> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) throw new NotFoundException('Role not found');

    const permissions = await Promise.all(
      command.permissionIds.map((id) => this.permissionRepository.findById(id)),
    );
    const validPermissions = permissions.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    role.permissions = validPermissions;
    return this.roleRepository.save(role);
  }

  async logAuditAction(data: {
    userId: string;
    action: string;
    module: string;
    recordId: string;
    payload: any;
  }): Promise<void> {
    await this.auditLogService.create({
      userId: data.userId,
      userName: '',
      action: data.action,
      module: data.module,
      recordId: data.recordId,
      ipAddress: '',
      payload: data.payload,
    });
  }
}
