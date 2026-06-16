import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('document_archives')
export class PostApprovalDocumentArchiveTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  declare documentType: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string;

  @Column({ type: 'uuid', nullable: true })
  declare contractId: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingResultId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  declare documentNumber: string;

  @Column({ type: 'varchar', length: 500 })
  declare minioPath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare signedDocumentUrl: string;

  @Column({ type: 'uuid', nullable: true })
  declare uploadedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare uploadedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  declare uploadedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare originalFilename: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;
}