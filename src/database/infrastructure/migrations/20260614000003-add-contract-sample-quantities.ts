import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractSampleQuantities20260614000003 implements MigrationInterface {
  name = 'AddContractSampleQuantities20260614000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contract_samples
      ADD COLUMN IF NOT EXISTS used_quantity INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_quantity INT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lab_contract_samples DROP COLUMN IF EXISTS used_quantity`);
    await queryRunner.query(`ALTER TABLE lab_contract_samples DROP COLUMN IF EXISTS completed_quantity`);
  }
}
