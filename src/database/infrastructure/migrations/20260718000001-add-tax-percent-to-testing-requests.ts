import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxPercentToTestingRequests20260718000001
  implements MigrationInterface
{
  name = 'AddTaxPercentToTestingRequests20260718000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
      ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
      DROP COLUMN IF EXISTS tax_percent
    `);
  }
}
