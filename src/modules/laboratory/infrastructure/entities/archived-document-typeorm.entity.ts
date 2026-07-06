import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('archived_documents')
export class ArchivedDocumentTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50 })
  declare documentType: string;

  @Column({ type: 'uuid' })
  declare entityId: string;

  @Column({ type: 'varchar', length: 50 })
  declare documentNumber: string;

  @Column({ type: 'varchar', length: 500 })
  declare minioPath: string;

  @Column({ type: 'varchar', length: 100 })
  declare minioBucket: string;

  @Column({ type: 'varchar', length: 100 })
  declare contentType: string;

  @Column({ type: 'bigint', nullable: true })
  declare fileSize: number;

  @Column({ type: 'uuid', nullable: true })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare customerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare archivedBy: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  declare archivedAt: Date;

  @Column({ type: 'int', default: 1825 })
  declare retentionPeriodDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  declare expiresAt: Date;
}
