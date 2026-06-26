import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { User } from '../../domain/entities/user.entity';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { ChangePasswordCommand } from '../commands/change-password.command';

export const USER_SERVICE = Symbol('USER_SERVICE');

export interface UserServicePort {
  create(command: CreateUserCommand): Promise<User>;
  findAll(
    page?: number,
    limit?: number,
    status?: string,
    role?: string,
    search?: string,
  ): Promise<FindResult<User>>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User>;
  update(id: string, command: UpdateUserCommand): Promise<User>;
  changePassword(command: ChangePasswordCommand): Promise<void>;
  forceSetPassword(userId: string, newPassword: string): Promise<void>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  logAuditAction(data: {
    userId: string;
    action: string;
    module: string;
    recordId: string;
    payload: any;
  }): Promise<void>;
}
