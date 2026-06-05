import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('maintenance_schedules')
export class MaintenanceScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare equipmentId: string;

  @Column({ type: 'varchar', length: 50 })
  declare intervalType: string;

  @Column({ type: 'integer' })
  declare intervalValue: number;

  @Column({ type: 'date', nullable: true })
  declare lastDoneDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  declare lastDoneHours: number;

  @Column({ type: 'date', nullable: true })
  declare nextDueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  declare nextDueHours: number;

  @Column({ type: 'varchar', length: 500 })
  declare description: string;
}
