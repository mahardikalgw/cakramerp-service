import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Permission } from '../../domain/entities/permission.entity';
import { CreatePermissionCommand } from '../commands/create-permission.command';

export const PERMISSION_SERVICE = Symbol('PERMISSION_SERVICE');

export interface PermissionServicePort {
  create(command: CreatePermissionCommand): Promise<Permission>;
  findAll(page?: number, limit?: number): Promise<FindResult<Permission>>;
  findById(id: string): Promise<Permission>;
  delete(id: string): Promise<void>;
}
