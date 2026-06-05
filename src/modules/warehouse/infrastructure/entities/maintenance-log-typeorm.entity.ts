import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('maintenance_logs')
export class MaintenanceLogTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare equipmentId: string;

  @Column({ type: 'date' })
  declare maintenanceDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  declare hoursAtMaintenance: number;

  @Column({ type: 'varchar', length: 100 })
  declare type: string;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare cost: number;

  @Column({ type: 'varchar', length: 255 })
  declare performedBy: string;

  @Column({ type: 'uuid' })
  declare createdBy: string;
}
