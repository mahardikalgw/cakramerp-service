import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('lab_schedule_samples')
export class LabScheduleSampleTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare scheduleId: string;

  @Column({ type: 'uuid' })
  declare contractSampleId: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingServiceId: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare serviceName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare sampleCode: string;

  @Column({ type: 'int', default: 1 })
  declare allocatedQuantity: number;

  @Column({ type: 'int', default: 0 })
  declare usedQuantity: number;

  @Column({ type: 'int', default: 0 })
  declare completedQuantity: number;
}
