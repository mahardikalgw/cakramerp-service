import { Entity, Column, ManyToOne } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { TestingRequestTypeOrmEntity } from './testing-request-typeorm.entity';

@Entity('testing_request_lines')
export class TestingRequestLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare testingRequestId: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingServiceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare serviceName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sample_code' })
  declare sampleCode: string | null;

  @Column({ type: 'int', nullable: true })
  declare sampleQuantity: number;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @ManyToOne(() => TestingRequestTypeOrmEntity, (request) => request.lines)
  testingRequest: TestingRequestTypeOrmEntity;
}
