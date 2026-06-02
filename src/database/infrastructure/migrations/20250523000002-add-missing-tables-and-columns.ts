import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingTablesAndColumns20250523000002 implements MigrationInterface {
  name = 'AddMissingTablesAndColumns20250523000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add missing updated_at column to journal_entry_lines
    await queryRunner.query(`
      ALTER TABLE journal_entry_lines
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    `);

    // 2. Create settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        value TEXT,
        category VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_settings_category ON settings (category)`,
    );

    // 3. Create audit_logs table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action_type AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'export');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        action audit_action_type NOT NULL,
        module VARCHAR(100) NOT NULL,
        record_id VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
        payload JSONB,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp)`,
    );

    // 4. Create backup_jobs table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE backup_status AS ENUM ('active', 'inactive', 'running');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS backup_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        status backup_status NOT NULL DEFAULT 'active',
        last_run TIMESTAMPTZ,
        next_run TIMESTAMPTZ,
        last_size VARCHAR(50),
        retention_days TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_backup_jobs_schedule ON backup_jobs (schedule)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs (status)`,
    );

    // 5. Create backup_history table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE backup_history_status AS ENUM ('success', 'failed', 'in_progress');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        backup_job_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        status backup_history_status NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        error_message TEXT,
        file_path VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_backup_history_job_id ON backup_history (backup_job_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history (status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_backup_history_completed ON backup_history (completed_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS backup_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS backup_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS settings`);
    await queryRunner.query(
      `ALTER TABLE journal_entry_lines DROP COLUMN IF EXISTS updated_at`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS backup_history_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS backup_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action_type`);
  }
}
