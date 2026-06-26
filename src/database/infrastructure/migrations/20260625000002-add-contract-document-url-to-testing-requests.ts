import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractDocumentUrlToTestingRequests20260625000002 implements MigrationInterface {
  name = 'AddContractDocumentUrlToTestingRequests20260625000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS contract_document_url VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS contract_document_url
    `);
  }
}
