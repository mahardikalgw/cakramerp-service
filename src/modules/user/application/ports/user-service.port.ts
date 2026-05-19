import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { User } from '../../domain/entities/user.entity';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';

export const USER_SERVICE = Symbol('USER_SERVICE');

export interface UserServicePort {
  create(command: CreateUserCommand): Promise<User>;
  findAll(page?: number, limit?: number): Promise<FindResult<User>>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User>;
  update(id: string, command: UpdateUserCommand): Promise<User>;
  delete(id: string): Promise<void>;
}
