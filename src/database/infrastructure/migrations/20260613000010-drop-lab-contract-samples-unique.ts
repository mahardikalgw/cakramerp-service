import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLabContractSamplesUnique20260613000010 implements MigrationInterface {
  name = 'DropLabContractSamplesUnique20260613000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lab_contract_samples_sample`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_contract_samples_sample ON lab_contract_samples(sample_id)`);
  }
}
