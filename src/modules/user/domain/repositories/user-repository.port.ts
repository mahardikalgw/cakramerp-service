import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepositoryPort extends RepositoryPort<User> {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithRoles(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
}
