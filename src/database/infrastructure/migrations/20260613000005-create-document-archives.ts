import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentArchives20260613000005 implements MigrationInterface {
  name = 'CreateDocumentArchives20260613000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_archives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR(50) NOT NULL,
        testing_request_id UUID REFERENCES testing_requests(id) ON DELETE RESTRICT,
        contract_id UUID REFERENCES lab_contracts(id) ON DELETE RESTRICT,
        testing_result_id UUID REFERENCES test_results(id) ON DELETE RESTRICT,
        document_number VARCHAR(100) NOT NULL UNIQUE,
        minio_path VARCHAR(500) NOT NULL,
        signed_document_url VARCHAR(500),
        uploaded_by UUID,
        uploaded_by_name VARCHAR(255),
        uploaded_at TIMESTAMP,
        original_filename VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_doc_archives_contract ON document_archives(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_doc_archives_result ON document_archives(testing_result_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_doc_archives_type ON document_archives(document_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_doc_archives_request ON document_archives(testing_request_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_doc_archives_status ON document_archives(status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS document_archives`);
  }
}