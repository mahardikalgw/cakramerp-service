import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabScheduleSamples20260613000008 implements MigrationInterface {
  name = 'CreateLabScheduleSamples20260613000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_schedule_samples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id UUID NOT NULL REFERENCES testing_schedules(id) ON DELETE CASCADE,
        contract_sample_id UUID NOT NULL REFERENCES lab_contract_samples(id),
        service_name VARCHAR(255) NOT NULL,
        sample_code VARCHAR(100),
        allocated_quantity INT NOT NULL DEFAULT 1,
        used_quantity INT NOT NULL DEFAULT 0,
        completed_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_schedule_samples_schedule ON lab_schedule_samples(schedule_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_schedule_samples_contract_sample ON lab_schedule_samples(contract_sample_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lab_schedule_samples`);
  }
}
