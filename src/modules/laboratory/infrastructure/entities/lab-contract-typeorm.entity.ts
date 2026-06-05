import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { LabContractAttachmentTypeOrmEntity } from './lab-contract-attachment-typeorm.entity';

@Entity('lab_contracts')
export class LabContractTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare contractNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'uuid', nullable: true })
  declare projectId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare projectName: string;

  @Column({ type: 'date', nullable: true })
  declare startDate: Date;

  @Column({ type: 'date', nullable: true })
  declare endDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare contractValue: number;

  @Column({ type: 'int', nullable: true })
  declare totalQuota: number;

  @Column({ type: 'int', default: 0 })
  declare usedQuota: number;

  @Column({ type: 'int', nullable: true })
  declare remainingQuota: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @OneToMany(
    () => LabContractAttachmentTypeOrmEntity,
    (attachment) => attachment.labContract,
    {
      cascade: true,
      eager: true,
    },
  )
  attachments: LabContractAttachmentTypeOrmEntity[];
}
