import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('maintenance_logs')
export class MaintenanceLogTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  equipmentId: string;

  @Column({ type: 'date' })
  maintenanceDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hoursAtMaintenance: number;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'varchar', length: 255 })
  performedBy: string;

  @Column({ type: 'uuid' })
  createdBy: string;
}
