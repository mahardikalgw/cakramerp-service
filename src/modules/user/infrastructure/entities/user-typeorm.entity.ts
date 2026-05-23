import { Entity, Column, ManyToMany, JoinTable, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { RoleTypeOrmEntity } from '../../../iam/infrastructure/entities/role-typeorm.entity';

export enum UserStatusTypeOrm {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class UserTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({
    type: 'enum',
    enum: UserStatusTypeOrm,
    default: UserStatusTypeOrm.ACTIVE,
  })
  @Index()
  status: UserStatusTypeOrm;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login' })
  lastLogin: Date;

  @ManyToMany(() => RoleTypeOrmEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: RoleTypeOrmEntity[];
}
