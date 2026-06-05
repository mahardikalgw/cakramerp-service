import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  UserProvisioningPort,
  CreateUserDto,
} from '../../../../shared/kernel/domain/ports/user-provisioning.port';
import { USER_SERVICE } from '../../../../modules/user/application/ports/user-service.port';
import type { UserServicePort } from '../../../../modules/user/application/ports/user-service.port';
import { CreateUserCommand } from '../../../../modules/user/application/commands/create-user.command';

/**
 * HR → User adapter for user provisioning.
 *
 * Handles employee-to-user creation and linking. This adapter is the only
 * place HR module talks to User module.
 */
@Injectable()
export class HrUserProvisioningAdapter implements UserProvisioningPort {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: UserServicePort,
    private readonly dataSource: DataSource,
  ) {}

  async createUser(dto: CreateUserDto): Promise<{ id: string; email: string }> {
    const defaultPassword = this.generateDefaultPassword(dto.firstName);
    const user = await this.userService.create(
      new CreateUserCommand(
        dto.email,
        dto.password ?? defaultPassword,
        dto.firstName,
        dto.lastName,
        dto.roles,
        (dto.status ?? 'active') as 'active' | 'inactive' | 'suspended',
      ),
    );
    return { id: user.id, email: user.email };
  }

  async linkUserToEmployee(userId: string, employeeId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET employee_id = $1 WHERE id = $2`,
      [employeeId, userId],
    );
  }

  private generateDefaultPassword(firstName: string): string {
    const timestamp = Date.now().toString().slice(-4);
    const name = (firstName || 'user').toLowerCase().replace(/[^a-z]/g, '');
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}@${timestamp}`;
  }
}
