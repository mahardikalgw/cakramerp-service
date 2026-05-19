import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission } from '../../domain/entities/permission.entity';
import type { PermissionRepositoryPort } from '../../domain/repositories/permission-repository.port';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission-repository.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { CreatePermissionCommand } from '../commands/create-permission.command';
import { PermissionServicePort } from '../ports/permission-service.port';

@Injectable()
export class PermissionService implements PermissionServicePort {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepositoryPort,
  ) {}

  async create(command: CreatePermissionCommand): Promise<Permission> {
    const permission = new Permission({
      name: command.name,
      resource: command.resource,
      action: command.action,
    });
    return this.permissionRepository.save(permission);
  }

  async findAll(page = 1, limit = 20): Promise<FindResult<Permission>> {
    return this.permissionRepository.findAll({ page, limit });
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.permissionRepository.delete(id);
    if (!deleted) throw new NotFoundException('Permission not found');
  }
}
