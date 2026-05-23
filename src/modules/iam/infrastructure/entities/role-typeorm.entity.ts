import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PermissionTypeOrmEntity } from './permission-typeorm.entity';
import { UserTypeOrmEntity } from '../../../user/infrastructure/entities/user-typeorm.entity';

@Entity('roles')
export class RoleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @ManyToMany(() => PermissionTypeOrmEntity, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: PermissionTypeOrmEntity[];

  @ManyToMany(() => UserTypeOrmEntity, (user) => user.roles)
  users: UserTypeOrmEntity[];
}
