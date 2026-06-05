import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSamplesAndSchedules20250604000006 implements MigrationInterface {
  name = 'CreateSamplesAndSchedules20250604000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── SAMPLES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS samples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sample_code VARCHAR(50) NOT NULL UNIQUE,
        sample_type_id UUID NOT NULL,
        sample_type_name VARCHAR(255) NOT NULL,
        testing_request_id UUID,
        testing_request_number VARCHAR(50),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        weight NUMERIC(18,4),
        location VARCHAR(255),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'awaiting_delivery',
        received_at TIMESTAMP,
        received_by VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── TESTING SCHEDULES ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testing_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        laboratory_id UUID NOT NULL,
        laboratory_name VARCHAR(255) NOT NULL,
        testing_request_id UUID,
        testing_request_number VARCHAR(50),
        sample_id UUID,
        sample_code VARCHAR(50),
        technician_id UUID,
        technician_name VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
      CREATE INDEX IF NOT EXISTS idx_samples_customer ON samples(customer_id);
      CREATE INDEX IF NOT EXISTS idx_samples_request ON samples(testing_request_id);
      CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(sample_code);
      CREATE INDEX IF NOT EXISTS idx_schedules_date ON testing_schedules(schedule_date);
      CREATE INDEX IF NOT EXISTS idx_schedules_laboratory ON testing_schedules(laboratory_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_status ON testing_schedules(status);
      CREATE INDEX IF NOT EXISTS idx_schedules_request ON testing_schedules(testing_request_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS testing_schedules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS samples;`);
  }
}
