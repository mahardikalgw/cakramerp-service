import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificateDocumentId20260614000002 implements MigrationInterface {
  name = 'AddCertificateDocumentId20260614000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS certificate_document_id UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_test_results_certificate_document ON test_results(certificate_document_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_test_results_certificate_document`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS certificate_document_id`,
    );
  }
}
