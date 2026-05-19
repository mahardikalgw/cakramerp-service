import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Role } from '../entities/role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepositoryPort extends RepositoryPort<Role> {
  findByName(name: string): Promise<Role | null>;
  findByNameWithPermissions(name: string): Promise<Role | null>;
}
