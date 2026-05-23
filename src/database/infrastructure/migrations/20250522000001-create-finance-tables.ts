import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateFinanceTables20250522000001 implements MigrationInterface {
  name = 'CreateFinanceTables20250522000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        segment VARCHAR(100),
        cost_center VARCHAR(100),
        parent_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_number VARCHAR(100) NOT NULL UNIQUE,
        date DATE NOT NULL,
        description TEXT,
        project_id UUID,
        segment VARCHAR(100),
        cost_center VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        debit NUMERIC(18,2) DEFAULT 0,
        credit NUMERIC(18,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ar_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        client_id VARCHAR(100) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        project_id UUID,
        segment VARCHAR(100),
        amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        due_date DATE NOT NULL,
        issue_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ap_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id VARCHAR(100) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        scheduled_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        segment VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        budget NUMERIC(18,2) NOT NULL DEFAULT 0,
        actual_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
        completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kpi_thresholds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_type VARCHAR(100) NOT NULL UNIQUE,
        value NUMERIC(18,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kpi_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'unread',
        related_value NUMERIC(18,2) NOT NULL DEFAULT 0,
        threshold_value NUMERIC(18,2) NOT NULL DEFAULT 0,
        related_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS kpi_alerts;
      DROP TABLE IF EXISTS kpi_thresholds;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS ap_payments;
      DROP TABLE IF EXISTS ar_invoices;
      DROP TABLE IF EXISTS journal_entry_lines;
      DROP TABLE IF EXISTS journal_entries;
      DROP TABLE IF EXISTS accounts;
    `)
  }
}
