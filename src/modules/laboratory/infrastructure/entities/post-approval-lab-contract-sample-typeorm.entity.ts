import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('lab_contract_samples')
export class PostApprovalLabContractSampleTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare contractId: string;

  @Column({ type: 'uuid' })
  declare sampleId: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255 })
  declare serviceName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare sampleCode: string;

  @Column({ type: 'int', default: 1 })
  declare sampleQuantity: number;

  @Column({ type: 'int', default: 0 })
  declare usedQuantity: number;

  @Column({ type: 'int', default: 0 })
  declare completedQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalPrice: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare status: string;
}
