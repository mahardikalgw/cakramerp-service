import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSelfServiceTables20250523000003 implements MigrationInterface {
  name = 'CreateSelfServiceTables20250523000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    // profile_change_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS profile_change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcr_employee ON profile_change_requests (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcr_status ON profile_change_requests (status)`,
    );

    // discrepancy_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discrepancy_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        attendance_date DATE NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        resolved_by UUID,
        resolved_at TIMESTAMPTZ,
        resolution TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dr_employee ON discrepancy_reports (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dr_status ON discrepancy_reports (status)`,
    );

    // leave_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        default_days_per_year INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // leave_balances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        leave_type_id UUID NOT NULL,
        year INT NOT NULL,
        total_days DECIMAL(5,1) NOT NULL,
        used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
        remaining_days DECIMAL(5,1) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(employee_id, leave_type_id, year)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lb_employee ON leave_balances (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lb_leave_type ON leave_balances (leave_type_id)`,
    );

    // leave_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        leave_type_id UUID NOT NULL,
        leave_type_name VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        working_days DECIMAL(5,1) NOT NULL,
        reason TEXT NOT NULL,
        attachment_path VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lr_employee ON leave_requests (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lr_status ON leave_requests (status)`,
    );

    // shift_schedules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shift_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        date DATE NOT NULL,
        shift_type VARCHAR(20) NOT NULL,
        site_id UUID,
        site_name VARCHAR(255),
        start_time TIME,
        end_time TIME,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ss_employee ON shift_schedules (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ss_date ON shift_schedules (date)`,
    );

    // overtime_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        hours DECIMAL(5,2) NOT NULL,
        reason TEXT NOT NULL,
        project_reference VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_or_employee ON overtime_requests (employee_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_or_status ON overtime_requests (status)`,
    );

    // Seed default leave types
    await queryRunner.query(`
      INSERT INTO leave_types (id, name, code, default_days_per_year) VALUES
        (gen_random_uuid(), 'Cuti Tahunan', 'annual', 12),
        (gen_random_uuid(), 'Cuti Sakit', 'sick', 14),
        (gen_random_uuid(), 'Cuti Melahirkan', 'maternity', 90),
        (gen_random_uuid(), 'Cuti Menikah', 'marriage', 3),
        (gen_random_uuid(), 'Cuti Duka', 'bereavement', 3),
        (gen_random_uuid(), 'Izin Tidak Masuk', 'unpaid', 0)
      ON CONFLICT (code) DO NOTHING
    `);

    // Add employee_id column to users table if not exists (links user account to employee record)
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id UUID
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_employee ON users (employee_id)`,
    );

    // Add supervisor_id to employees if not exists
    await queryRunner.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_id UUID
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS supervisor_id`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS employee_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS overtime_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS shift_schedules`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_balances`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS discrepancy_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS profile_change_requests`);
  }
}
