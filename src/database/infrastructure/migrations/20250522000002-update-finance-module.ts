import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFinanceModule20250522000002 implements MigrationInterface {
  name = 'UpdateFinanceModule20250522000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== Alter existing tables ====================

    // Add new columns to accounts table
    await queryRunner.query(`
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tax_category VARCHAR(100);
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);

    // Add new columns to journal_entries table
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft';
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS created_by UUID;
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_by UUID;
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reversal_of_id UUID;
    `);

    // ==================== AR Invoice Lines ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ar_invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
        description VARCHAR(500) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
        unit_price NUMERIC(18,2) NOT NULL,
        tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        amount NUMERIC(18,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== AP Invoices ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ap_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        vendor_id UUID NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        supplier_invoice_number VARCHAR(255),
        po_reference_id UUID,
        grn_reference_id UUID,
        amount NUMERIC(18,2) NOT NULL,
        paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        three_way_match_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        bank_account_id UUID,
        scheduled_payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== Bank Accounts ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        gl_account_id UUID,
        current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== Reconciliation Sessions ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
        is_locked BOOLEAN NOT NULL DEFAULT false,
        matched_total NUMERIC(18,2) NOT NULL DEFAULT 0,
        unmatched_gl_count INTEGER NOT NULL DEFAULT 0,
        unmatched_bank_count INTEGER NOT NULL DEFAULT 0,
        difference NUMERIC(18,2) NOT NULL DEFAULT 0,
        created_by UUID NOT NULL,
        finalized_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== Bank Statement Lines ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bank_statement_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reconciliation_session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        description VARCHAR(500) NOT NULL,
        debit NUMERIC(18,2) NOT NULL DEFAULT 0,
        credit NUMERIC(18,2) NOT NULL DEFAULT 0,
        balance NUMERIC(18,2) NOT NULL,
        reference VARCHAR(255),
        matched_journal_line_id UUID,
        match_status VARCHAR(50) NOT NULL DEFAULT 'unmatched',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== Tax Invoices (e-Faktur) ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tax_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tax_invoice_number VARCHAR(100) NOT NULL UNIQUE,
        ar_invoice_id UUID NOT NULL REFERENCES ar_invoices(id),
        transaction_date DATE NOT NULL,
        client_npwp VARCHAR(20) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        dpp NUMERIC(18,2) NOT NULL,
        ppn_amount NUMERIC(18,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'created',
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==================== Indexes ====================

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
      CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON ar_invoices(status);
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_client ON ar_invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON ar_invoices(due_date);
      CREATE INDEX IF NOT EXISTS idx_ap_invoices_vendor ON ap_invoices(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_ap_invoices_status ON ap_invoices(status);
      CREATE INDEX IF NOT EXISTS idx_ap_invoices_due_date ON ap_invoices(due_date);
      CREATE INDEX IF NOT EXISTS idx_tax_invoices_period ON tax_invoices(month, year);
      CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_session ON bank_statement_lines(reconciliation_session_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
      CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_accounts_is_active;
      DROP INDEX IF EXISTS idx_accounts_type;
      DROP INDEX IF EXISTS idx_bank_statement_lines_session;
      DROP INDEX IF EXISTS idx_tax_invoices_period;
      DROP INDEX IF EXISTS idx_ap_invoices_due_date;
      DROP INDEX IF EXISTS idx_ap_invoices_status;
      DROP INDEX IF EXISTS idx_ap_invoices_vendor;
      DROP INDEX IF EXISTS idx_ar_invoices_due_date;
      DROP INDEX IF EXISTS idx_ar_invoices_client;
      DROP INDEX IF EXISTS idx_ar_invoices_status;
      DROP INDEX IF EXISTS idx_journal_entry_lines_entry;
      DROP INDEX IF EXISTS idx_journal_entry_lines_account;
      DROP INDEX IF EXISTS idx_journal_entries_date;
      DROP INDEX IF EXISTS idx_journal_entries_status;

      DROP TABLE IF EXISTS tax_invoices;
      DROP TABLE IF EXISTS bank_statement_lines;
      DROP TABLE IF EXISTS reconciliation_sessions;
      DROP TABLE IF EXISTS bank_accounts;
      DROP TABLE IF EXISTS ap_invoices;
      DROP TABLE IF EXISTS ar_invoice_lines;

      ALTER TABLE journal_entries DROP COLUMN IF EXISTS reference;
      ALTER TABLE journal_entries DROP COLUMN IF EXISTS status;
      ALTER TABLE journal_entries DROP COLUMN IF EXISTS created_by;
      ALTER TABLE journal_entries DROP COLUMN IF EXISTS approved_by;
      ALTER TABLE journal_entries DROP COLUMN IF EXISTS approved_at;
      ALTER TABLE journal_entries DROP COLUMN IF EXISTS reversal_of_id;
      ALTER TABLE accounts DROP COLUMN IF EXISTS tax_category;
      ALTER TABLE accounts DROP COLUMN IF EXISTS is_active;
    `);
  }
}
