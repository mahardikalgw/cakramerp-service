import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('attendance_records')
export class AttendanceRecordTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'timestamp', nullable: true })
  declare clockIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  declare clockOut: Date;

  @Column({ type: 'varchar', length: 50 })
  declare status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare absenceReason: string;

  @Column({ type: 'boolean', default: false })
  declare isImported: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare overtimeHours: number;
}
