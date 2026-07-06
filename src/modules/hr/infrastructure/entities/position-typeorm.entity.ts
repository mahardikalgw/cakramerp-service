import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('positions')
export class PositionTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'uuid', nullable: true })
  declare departmentId: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
