import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('attendance_records')
export class AttendanceRecordTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp', nullable: true })
  clockIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  clockOut: Date;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  absenceReason: string;

  @Column({ type: 'boolean', default: false })
  isImported: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;
}
