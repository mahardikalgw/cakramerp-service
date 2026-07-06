import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('accounts')
export class AccountTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare code: string;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 50 })
  declare type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare taxCategory: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare segment: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare costCenter: string;

  @Column({ type: 'uuid', nullable: true })
  declare parentId: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
