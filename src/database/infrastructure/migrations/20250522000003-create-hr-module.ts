import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateHrModule20250522000003 implements MigrationInterface {
  name = 'CreateHrModule20250522000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== Employees ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_number VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        date_of_birth DATE,
        address TEXT,
        employment_type VARCHAR(50) NOT NULL DEFAULT 'permanent',
        position_id UUID,
        position_name VARCHAR(255),
        department_id UUID,
        department_name VARCHAR(255),
        site_id UUID,
        site_name VARCHAR(255),
        join_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        basic_salary NUMERIC(18,2) NOT NULL DEFAULT 0,
        bank_account_number VARCHAR(100),
        bank_name VARCHAR(255),
        npwp VARCHAR(30),
        bpjs_kesehatan_number VARCHAR(50),
        bpjs_ketenagakerjaan_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Employee Documents ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        expiry_date DATE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Employee History ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        previous_value VARCHAR(255),
        new_value VARCHAR(255),
        effective_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Attendance Records ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        clock_in TIMESTAMP,
        clock_out TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'present',
        absence_reason VARCHAR(500),
        is_imported BOOLEAN NOT NULL DEFAULT false,
        overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Payroll Runs ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        total_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
        total_net NUMERIC(18,2) NOT NULL DEFAULT 0,
        total_employees INTEGER NOT NULL DEFAULT 0,
        confirmed_at TIMESTAMP,
        confirmed_by UUID,
        posted_at TIMESTAMP,
        posted_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month, year)
      );
    `)

    // ==================== Payroll Details ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payroll_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id),
        employee_name VARCHAR(255) NOT NULL,
        basic_salary NUMERIC(18,2) NOT NULL,
        site_allowance NUMERIC(18,2) NOT NULL DEFAULT 0,
        meal_allowance NUMERIC(18,2) NOT NULL DEFAULT 0,
        transport_allowance NUMERIC(18,2) NOT NULL DEFAULT 0,
        overtime_pay NUMERIC(18,2) NOT NULL DEFAULT 0,
        other_allowances NUMERIC(18,2) NOT NULL DEFAULT 0,
        gross_pay NUMERIC(18,2) NOT NULL,
        bpjs_kesehatan_employee NUMERIC(18,2) NOT NULL DEFAULT 0,
        bpjs_kesehatan_employer NUMERIC(18,2) NOT NULL DEFAULT 0,
        bpjs_jkk NUMERIC(18,2) NOT NULL DEFAULT 0,
        bpjs_jkm NUMERIC(18,2) NOT NULL DEFAULT 0,
        bpjs_jht NUMERIC(18,2) NOT NULL DEFAULT 0,
        bpjs_jp NUMERIC(18,2) NOT NULL DEFAULT 0,
        pph21 NUMERIC(18,2) NOT NULL DEFAULT 0,
        loan_deduction NUMERIC(18,2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
        total_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
        net_pay NUMERIC(18,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== THR Records ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS thr_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        employee_name VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        months_of_service INTEGER NOT NULL,
        monthly_salary NUMERIC(18,2) NOT NULL,
        thr_amount NUMERIC(18,2) NOT NULL,
        is_pro_rated BOOLEAN NOT NULL DEFAULT false,
        is_excluded BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'calculated',
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== BPJS Enrollments ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bpjs_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        program VARCHAR(50) NOT NULL,
        member_number VARCHAR(100) NOT NULL,
        enrollment_date DATE NOT NULL,
        end_date DATE,
        salary NUMERIC(18,2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Indexes ====================

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
      CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);
      CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
      CREATE INDEX IF NOT EXISTS idx_employees_site ON employees(site_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
      CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(year, month);
      CREATE INDEX IF NOT EXISTS idx_payroll_details_run ON payroll_details(payroll_run_id);
      CREATE INDEX IF NOT EXISTS idx_payroll_details_employee ON payroll_details(employee_id);
      CREATE INDEX IF NOT EXISTS idx_thr_records_year ON thr_records(year);
      CREATE INDEX IF NOT EXISTS idx_bpjs_enrollments_employee ON bpjs_enrollments(employee_id);
      CREATE INDEX IF NOT EXISTS idx_bpjs_enrollments_program ON bpjs_enrollments(program);
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_history_employee ON employee_history(employee_id);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_history_employee;
      DROP INDEX IF EXISTS idx_employee_documents_employee;
      DROP INDEX IF EXISTS idx_bpjs_enrollments_program;
      DROP INDEX IF EXISTS idx_bpjs_enrollments_employee;
      DROP INDEX IF EXISTS idx_thr_records_year;
      DROP INDEX IF EXISTS idx_payroll_details_employee;
      DROP INDEX IF EXISTS idx_payroll_details_run;
      DROP INDEX IF EXISTS idx_payroll_runs_period;
      DROP INDEX IF EXISTS idx_attendance_date;
      DROP INDEX IF EXISTS idx_attendance_employee_date;
      DROP INDEX IF EXISTS idx_employees_site;
      DROP INDEX IF EXISTS idx_employees_department;
      DROP INDEX IF EXISTS idx_employees_employment_type;
      DROP INDEX IF EXISTS idx_employees_status;

      DROP TABLE IF EXISTS bpjs_enrollments;
      DROP TABLE IF EXISTS thr_records;
      DROP TABLE IF EXISTS payroll_details;
      DROP TABLE IF EXISTS payroll_runs;
      DROP TABLE IF EXISTS attendance_records;
      DROP TABLE IF EXISTS employee_history;
      DROP TABLE IF EXISTS employee_documents;
      DROP TABLE IF EXISTS employees;
    `)
  }
}
