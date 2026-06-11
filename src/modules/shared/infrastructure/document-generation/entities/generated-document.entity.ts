import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('generated_documents')
export class GeneratedDocumentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, name: 'document_type' })
  declare documentType: string;

  @Column({ type: 'uuid', name: 'entity_id' })
  declare entityId: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  declare fileName: string;

  @Column({ type: 'varchar', length: 500, name: 'minio_path' })
  declare minioPath: string;

  @Column({ type: 'varchar', length: 100, name: 'minio_bucket' })
  declare minioBucket: string;

  @Column({ type: 'varchar', length: 100, name: 'content_type' })
  declare contentType: string;

  @Column({ type: 'bigint', name: 'file_size' })
  declare fileSize: number;

  @Column({ type: 'varchar', length: 50 })
  declare status: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'output_format',
  })
  declare outputFormat: string;

  @Column({ type: 'jsonb', nullable: true })
  declare parameters: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  declare errorMessage: string;

  @Column({ type: 'uuid', name: 'requested_by', nullable: true })
  declare requestedBy: string;

  @Column({ type: 'timestamptz', name: 'requested_at' })
  declare requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  declare completedAt: Date;
}
