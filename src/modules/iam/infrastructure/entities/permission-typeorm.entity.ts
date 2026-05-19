import { Entity, Column, ManyToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { RoleTypeOrmEntity } from './role-typeorm.entity';

@Entity('permissions')
export class PermissionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @ManyToMany(() => RoleTypeOrmEntity, (role) => role.permissions)
  roles: RoleTypeOrmEntity[];
}
