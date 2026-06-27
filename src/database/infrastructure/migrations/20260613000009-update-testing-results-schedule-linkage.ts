import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTestingResultsScheduleLinkage20260613000009 implements MigrationInterface {
  name = 'UpdateTestingResultsScheduleLinkage20260613000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_testing_results_sample`);
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES testing_schedules(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS schedule_sample_id UUID REFERENCES lab_schedule_samples(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS sample_unit INT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_testing_results_quota_unit ON test_results(schedule_sample_id, sample_unit) WHERE schedule_sample_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_results_schedule ON test_results(schedule_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_results_schedule`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_results_quota_unit`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS sample_unit`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS schedule_sample_id`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS schedule_id`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_testing_results_sample ON test_results(sample_id)`,
    );
  }
}
