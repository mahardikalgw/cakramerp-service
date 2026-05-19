import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Role } from '../../domain/entities/role.entity';
import { CreateRoleCommand } from '../commands/create-role.command';
import { AssignRoleCommand } from '../commands/assign-role.command';

export const ROLE_SERVICE = Symbol('ROLE_SERVICE');

export interface RoleServicePort {
  create(command: CreateRoleCommand): Promise<Role>;
  findAll(page?: number, limit?: number): Promise<FindResult<Role>>;
  findById(id: string): Promise<Role>;
  findByName(name: string): Promise<Role>;
  delete(id: string): Promise<void>;
  assignRolesToUser(command: AssignRoleCommand): Promise<void>;
}
