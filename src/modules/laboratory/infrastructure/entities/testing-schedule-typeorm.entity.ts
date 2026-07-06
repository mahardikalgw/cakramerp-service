import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('testing_schedules')
export class TestingScheduleTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'date', nullable: true })
  declare scheduleDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
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

  @Column({ type: 'uuid', nullable: true })
  declare contractId: string;

  @Column({ type: 'uuid', nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdByName: string;

  @Column({ type: 'date', nullable: true })
  declare scheduledDate: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare scheduledTime: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare scheduledLocation: string | null;

  @Column({ type: 'int', nullable: true })
  declare qtySamples: number;

  @Column({ type: 'uuid', nullable: true })
  declare laboranId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare laboranName: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare confirmedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare confirmedByName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  declare confirmedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  declare statusNotes: string | null;
}
