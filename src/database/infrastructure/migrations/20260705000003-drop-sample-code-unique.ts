import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the unique constraint on samples.sample_code.
 *
 * Multiple physical samples can share the same sample code when a customer
 * submits a testing request with sampleQuantity > 1 — they all represent
 * the same material batch.  The unique constraint prevents this legitimate
 * use case and must be removed.
 */
export class DropSampleCodeUnique20260705000003 implements MigrationInterface {
  name = 'DropSampleCodeUnique20260705000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE samples
      DROP CONSTRAINT IF EXISTS samples_sample_code_key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE samples
      ADD CONSTRAINT samples_sample_code_key UNIQUE (sample_code)
    `);
  }
}
