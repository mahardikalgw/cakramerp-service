import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  UserIdentity,
  UserIdentityPort,
} from '../../../../shared/kernel/domain/ports/user-identity.port';
import { UserTypeOrmEntity } from '../entities/user-typeorm.entity';

@Injectable()
export class UserIdentityAdapter implements UserIdentityPort {
  constructor(private readonly dataSource: DataSource) {}

  async getIdentity(userId: string): Promise<UserIdentity | null> {
    const userRepo = this.dataSource.getRepository(UserTypeOrmEntity);
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return null;

    const permissions = new Set<string>();
    const roles: string[] = [];

    for (const role of user.roles) {
      roles.push(role.name);
      for (const permission of role.permissions) {
        permissions.add(`${permission.resource}:${permission.action}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: Array.from(permissions),
    };
  }
}
