import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { UserRoleAssignerPort } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { RoleTypeOrmEntity } from '../../../iam/infrastructure/entities/role-typeorm.entity';
import { UserTypeOrmEntity } from '../entities/user-typeorm.entity';

@Injectable()
export class UserRoleAssignerAdapter implements UserRoleAssignerPort {
  constructor(private readonly dataSource: DataSource) {}

  async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    const userRepo = this.dataSource.getRepository(UserTypeOrmEntity);
    const roleRepo = this.dataSource.getRepository(RoleTypeOrmEntity);

    const user = await userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const roles = await roleRepo.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('Some roles not found');
    }

    user.roles = roles;
    await userRepo.save(user);
  }
}
