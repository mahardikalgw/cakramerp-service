import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { User, UserStatus } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.port';
import type { UserRoleAssignerPort } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { AUDIT_LOG_SERVICE } from '../../../audit/application/ports/audit-log-service.port';
import type { AuditLogServicePort } from '../../../audit/application/ports/audit-log-service.port';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { UserServicePort } from '../ports/user-service.port';

@Injectable()
export class UserService implements UserServicePort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_ROLE_ASSIGNER_PORT)
    private readonly userRoleAssigner: UserRoleAssignerPort,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: AuditLogServicePort,
  ) {}

  async create(command: CreateUserCommand): Promise<User> {
    const exists = await this.userRepository.existsByEmail(command.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(command.password, 12);
    const user = new User({
      email: command.email,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
      status: command.status
        ? UserStatus[command.status.toUpperCase() as keyof typeof UserStatus]
        : UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // Handle role assignments if provided
    if (command.roleIds && command.roleIds.length > 0) {
      await this.userRoleAssigner.assignRoles(savedUser.id, command.roleIds);
    }

    return savedUser;
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: string,
    role?: string,
  ): Promise<FindResult<User>> {
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    if (role) filters.role = role;
    return this.userRepository.findAll({ page, limit, filters });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, command: UpdateUserCommand): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (command.firstName !== undefined) user.firstName = command.firstName;
    if (command.lastName !== undefined) user.lastName = command.lastName;
    if (command.status !== undefined) {
      if (command.status === 'active') user.activate();
      else if (command.status === 'inactive') user.deactivate();
    }

    // Handle role assignments if provided
    if (command.roleIds !== undefined) {
      await this.userRoleAssigner.assignRoles(id, command.roleIds);
    }

    return this.userRepository.save(user);
  }

  async changePassword(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcryptjs.hash(command.password, 12);
    user.passwordHash = passwordHash;
    await this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    // Never physically delete - only deactivate
    await this.deactivate(id);
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.deactivate();
    await this.userRepository.save(user);

    // TODO: Invalidate all active sessions for this user
    // This would require deleting refresh tokens from the database
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
