import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestingResultMetadata20260715000001
  implements MigrationInterface
{
  name = 'AddTestingResultMetadata20260715000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS testing_date TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS created_date TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS mutu VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS produk VARCHAR(255)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_results_testing_date ON test_results(testing_date)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS testing_date`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS created_date`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS mutu`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS produk`,
    );
  }
}