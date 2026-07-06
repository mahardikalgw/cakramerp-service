import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('laboratories')
export class LaboratoryTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare location: string;

  @Column({ type: 'int', nullable: true })
  declare capacity: number;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
