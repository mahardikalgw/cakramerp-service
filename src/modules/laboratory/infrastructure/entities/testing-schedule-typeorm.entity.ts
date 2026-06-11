import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('testing_schedules')
export class TestingScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'date' })
  declare scheduleDate: Date;

  @Column({ type: 'varchar', length: 50 })
  declare timeSlot: string;

  @Column({ type: 'uuid', nullable: true })
  declare laboratoryId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare laboratoryName: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare testingRequestNumber: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare sampleId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare sampleCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare technicianId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare technicianName: string | null;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;

  @Column({ type: 'varchar', length: 50, default: 'scheduled' })
  declare status: string;
}
