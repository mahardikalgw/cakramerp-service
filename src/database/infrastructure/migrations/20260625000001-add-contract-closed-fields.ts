import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractClosedFields20260625000001 implements MigrationInterface {
  name = 'AddContractClosedFields20260625000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS closed_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        DROP COLUMN IF EXISTS closed_at,
        DROP COLUMN IF EXISTS closed_by,
        DROP COLUMN IF EXISTS closed_by_name
    `);
  }
}
