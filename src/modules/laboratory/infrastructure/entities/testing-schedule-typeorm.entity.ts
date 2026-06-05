import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('testing_schedules')
export class TestingScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'date' })
  declare scheduleDate: Date;

  @Column({ type: 'varchar', length: 50 })
  declare timeSlot: string;

  @Column({ type: 'uuid' })
  declare laboratoryId: string;

  @Column({ type: 'varchar', length: 255 })
  declare laboratoryName: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare testingRequestNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare sampleId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare sampleCode: string;

  @Column({ type: 'uuid', nullable: true })
  declare technicianId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare technicianName: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'varchar', length: 50, default: 'scheduled' })
  declare status: string;
}
