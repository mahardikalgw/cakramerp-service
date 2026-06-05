import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('shift_schedules')
export class ShiftScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  declare employeeId: string;

  @Column({ type: 'date' })
  @Index()
  declare date: Date;

  @Column({ type: 'varchar', length: 20, name: 'shift_type' })
  declare shiftType: string;

  @Column({ type: 'uuid', nullable: true, name: 'site_id' })
  declare siteId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'site_name' })
  declare siteName: string | null;

  @Column({ type: 'time', nullable: true, name: 'start_time' })
  declare startTime: string | null;

  @Column({ type: 'time', nullable: true, name: 'end_time' })
  declare endTime: string | null;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;
}
