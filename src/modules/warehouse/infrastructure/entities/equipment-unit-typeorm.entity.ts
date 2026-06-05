import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('equipment_units')
export class EquipmentUnitTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare unitId: string;

  @Column({ type: 'varchar', length: 100 })
  declare type: string;

  @Column({ type: 'varchar', length: 100 })
  declare brand: string;

  @Column({ type: 'varchar', length: 100 })
  declare model: string;

  @Column({ type: 'integer' })
  declare year: number;

  @Column({ type: 'uuid', nullable: true })
  declare siteId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare siteName: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  declare status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  declare currentHours: number;
}
