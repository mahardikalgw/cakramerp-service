import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('lab_certificates')
export class LabCertificateTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare certificateNumber: string;

  @Column({ type: 'uuid' })
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 50 })
  declare testingRequestNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare testResultId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare resultNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare sampleCode: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare serviceName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare qrHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare issuedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare issuedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare revokedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  declare revokedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare revocationReason: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare minioPath: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  declare status: string;
}
