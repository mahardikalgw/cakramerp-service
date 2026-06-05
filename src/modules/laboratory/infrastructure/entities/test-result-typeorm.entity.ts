import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { TestResultAttachmentTypeOrmEntity } from './test-result-attachment-typeorm.entity';

@Entity('test_results')
export class TestResultTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare resultNumber: string;

  @Column({ type: 'uuid' })
  declare sampleId: string;

  @Column({ type: 'varchar', length: 50 })
  declare sampleCode: string;

  @Column({ type: 'uuid' })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255 })
  declare serviceName: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 255 })
  declare parameter: string;

  @Column({ type: 'text' })
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

  @OneToMany(
    () => TestResultAttachmentTypeOrmEntity,
    (attachment) => attachment.testResult,
    { cascade: true, eager: true },
  )
  attachments: TestResultAttachmentTypeOrmEntity[];
}
