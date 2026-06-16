import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('sample_quotas')
@Index('idx_sample_quotas_request', ['testingRequestId'])
@Index('idx_sample_quotas_service', ['testingServiceId'])
@Index('idx_sample_quotas_customer', ['customerId'])
export class SampleQuotaTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare testingRequestId: string;

  @Column({ type: 'uuid' })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255 })
  declare testingServiceName: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'int', default: 0 })
  declare totalQuota: number;

  @Column({ type: 'int', default: 0 })
  declare usedQuota: number;

  @Column({ type: 'int', default: 0 })
  declare remainingQuota: number;

  @Column({ type: 'timestamp' })
  declare grantedAt: Date;

  @Column({ type: 'varchar', length: 255 })
  declare grantedBy: string;
}
