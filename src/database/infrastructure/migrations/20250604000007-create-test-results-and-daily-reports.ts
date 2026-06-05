import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestResultsAndDailyReports20250604000007 implements MigrationInterface {
  name = 'CreateTestResultsAndDailyReports20250604000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── TEST RESULTS ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        result_number VARCHAR(50) NOT NULL UNIQUE,
        sample_id UUID NOT NULL,
        sample_code VARCHAR(50) NOT NULL,
        testing_service_id UUID NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        testing_request_id UUID,
        parameter VARCHAR(255) NOT NULL,
        result_value TEXT NOT NULL,
        unit VARCHAR(50),
        laboratory_notes TEXT,
        tested_by_id UUID,
        tested_by_name VARCHAR(255),
        tested_at TIMESTAMP,
        approved_by_id UUID,
        approved_at TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS test_result_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── DAILY REPORTS ──────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_number VARCHAR(50) NOT NULL UNIQUE,
        report_date DATE NOT NULL,
        testing_request_id UUID NOT NULL,
        testing_request_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMP,
        approved_by_id UUID,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_report_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        test_result_id UUID NOT NULL,
        result_number VARCHAR(50) NOT NULL,
        sample_code VARCHAR(50) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        parameter VARCHAR(255) NOT NULL,
        result_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_test_results_sample ON test_results(sample_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_request ON test_results(testing_request_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
      CREATE INDEX IF NOT EXISTS idx_test_results_number ON test_results(result_number);
      CREATE INDEX IF NOT EXISTS idx_test_result_att_result ON test_result_attachments(test_result_id);
      CREATE INDEX IF NOT EXISTS idx_daily_reports_request ON daily_reports(testing_request_id);
      CREATE INDEX IF NOT EXISTS idx_daily_reports_customer ON daily_reports(customer_id);
      CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);
      CREATE INDEX IF NOT EXISTS idx_daily_report_lines_report ON daily_report_lines(daily_report_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS daily_report_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS daily_reports;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test_result_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS test_results;`);
  }
}
