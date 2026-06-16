import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSampleQuantity20260614000001 implements MigrationInterface {
  name = 'AddSampleQuantity20260614000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE samples
      ADD COLUMN quantity NUMERIC(18,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE samples
      DROP COLUMN quantity
    `);
  }
}
