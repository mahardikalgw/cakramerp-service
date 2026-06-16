import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { TestResultAttachmentTypeOrmEntity } from './test-result-attachment-typeorm.entity';

@Entity('test_results')
export class TestResultTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  declare resultNumber: string;

  @Column({ type: 'uuid' })
  declare sampleId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare sampleCode: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare serviceName: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare parameter: string;

  @Column({ type: 'text', nullable: true })
  declare resultValue: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare unit: string;

  @Column({ type: 'text', nullable: true })
  declare laboratoryNotes: string;

  @Column({ type: 'uuid', nullable: true })
  declare testedById: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare testedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  declare testedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare approvedById: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'uuid', nullable: true })
  declare contractId: string;

  @Column({ type: 'uuid', nullable: true })
  declare contractSampleId: string;

  @Column({ type: 'uuid', nullable: true })
  declare scheduleId: string;

  @Column({ type: 'uuid', nullable: true })
  declare scheduleSampleId: string;

  @Column({ type: 'int', nullable: true })
  declare sampleUnit: number | null;

  @Column({ type: 'uuid', nullable: true })
  declare submittedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare submittedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  declare submittedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  declare resultData: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  declare resultNotes: string;

  @Column({ type: 'uuid', nullable: true })
  declare confirmedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare confirmedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  declare confirmedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @Column({ type: 'uuid', nullable: true })
  declare certificateDocumentId: string | null;

  @OneToMany(
    () => TestResultAttachmentTypeOrmEntity,
    (attachment) => attachment.testResult,
    { cascade: true, eager: true },
  )
  attachments: TestResultAttachmentTypeOrmEntity[];
}
