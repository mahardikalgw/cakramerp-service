import { Entity, Column, ManyToOne } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { TestResultTypeOrmEntity } from './test-result-typeorm.entity';

@Entity('test_result_attachments')
export class TestResultAttachmentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare testResultId: string;

  @Column({ type: 'varchar', length: 255 })
  declare fileName: string;

  @Column({ type: 'varchar', length: 500 })
  declare fileUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare fileType: string;

  @ManyToOne(() => TestResultTypeOrmEntity, (result) => result.attachments)
  testResult: TestResultTypeOrmEntity;
}
