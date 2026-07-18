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

    // Backfill unit_price from testing_services for existing records
    await queryRunner.query(`
      UPDATE testing_request_lines trl
      SET unit_price = ts.unit_price
      FROM testing_services ts
      WHERE trl.testing_service_id = ts.id
      AND trl.unit_price = 0
      AND ts.unit_price IS NOT NULL
      AND ts.unit_price > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
      DROP COLUMN IF EXISTS unit_price
    `);
  }
}