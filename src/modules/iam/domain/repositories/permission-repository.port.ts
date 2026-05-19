import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Permission } from '../entities/permission.entity';

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

export interface PermissionRepositoryPort extends RepositoryPort<Permission> {
  findByName(name: string): Promise<Permission | null>;
}
