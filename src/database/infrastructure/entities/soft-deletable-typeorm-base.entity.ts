import { DeleteDateColumn } from 'typeorm';
import { TypeOrmBaseEntity } from './typeorm-base.entity';

/**
 * Extends TypeOrmBaseEntity with a deleted_at column for soft delete support.
 * Only entities whose database tables have a deleted_at column should extend
 * this class.  Entities that participate in ManyToMany join tables without
 * a deleted_at column must extend TypeOrmBaseEntity directly to avoid TypeORM
 * injecting deleted_at IS NULL filters on the join table.
 */
export abstract class SoftDeletableTypeOrmEntity extends TypeOrmBaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  declare deletedAt: Date | null;
}
