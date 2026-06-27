import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractDocUrlsToTestingRequests1718668800002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests ADD COLUMN IF NOT EXISTS contract_document_url VARCHAR(500) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE testing_requests ADD COLUMN IF NOT EXISTS tax_invoice_url VARCHAR(500) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE testing_requests DROP COLUMN IF EXISTS tax_invoice_url;`,
    );
    await queryRunner.query(
      `ALTER TABLE testing_requests DROP COLUMN IF EXISTS contract_document_url;`,
    );
  }
}
