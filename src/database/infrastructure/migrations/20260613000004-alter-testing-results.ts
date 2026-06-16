import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTestingResults20260613000004 implements MigrationInterface {
  name = 'AlterTestingResults20260613000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES lab_contracts(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS contract_sample_id UUID REFERENCES lab_contract_samples(id)`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS submitted_by UUID`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS result_notes TEXT`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS confirmed_by UUID`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS confirmed_by_name VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_testing_results_contract ON test_results(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_testing_results_status ON test_results(status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS contract_id`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS contract_sample_id`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS submitted_by`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS submitted_by_name`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS submitted_at`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS result_data`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS result_notes`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS confirmed_by`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS confirmed_by_name`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS confirmed_at`);
    await queryRunner.query(`ALTER TABLE test_results DROP COLUMN IF EXISTS rejection_reason`);
  }
}