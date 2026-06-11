import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeneratedDocuments20250606000001 implements MigrationInterface {
  name = 'CreateGeneratedDocuments20250606000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        minio_path VARCHAR(500) NOT NULL,
        minio_bucket VARCHAR(100) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        output_format VARCHAR(50),
        parameters JSONB,
        error_message TEXT,
        requested_by UUID NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_generated_documents_document_type ON generated_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_generated_documents_entity_id ON generated_documents(entity_id);
      CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON generated_documents(status);
      CREATE INDEX IF NOT EXISTS idx_generated_documents_requested_by ON generated_documents(requested_by);
      CREATE INDEX IF NOT EXISTS idx_generated_documents_type_entity ON generated_documents(document_type, entity_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS generated_documents;`);
  }
}
