import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitPriceToTestingRequestLines20260718000002
  implements MigrationInterface
{
  name = 'AddUnitPriceToTestingRequestLines20260718000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
      ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2) DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
      DROP COLUMN IF EXISTS unit_price
    `);
  }
}