import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('laboratories')
export class LaboratoryTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare location: string;

  @Column({ type: 'int', nullable: true })
  declare capacity: number;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
