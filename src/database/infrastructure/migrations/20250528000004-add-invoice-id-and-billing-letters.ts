import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceIdAndBillingLetters20250528000004 implements MigrationInterface {
  name = 'AddInvoiceIdAndBillingLetters20250528000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add invoice_id to subsidiary ledgers
    await queryRunner.query(`
      ALTER TABLE ar_subsidiary_ledger ADD COLUMN IF NOT EXISTS invoice_id UUID;
      ALTER TABLE ap_subsidiary_ledger ADD COLUMN IF NOT EXISTS invoice_id UUID;
    `);

    // Add invoice_id to journal_entries (to track which invoice this journal is for)
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS invoice_id UUID;
    `);

    // Add invoice_id to gl_posting_queue (carry invoice reference through the chain)
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS invoice_id UUID;
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_subsidiary_invoice ON ar_subsidiary_ledger(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_ap_subsidiary_invoice ON ap_subsidiary_ledger(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_invoice_id ON journal_entries(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_gl_posting_queue_invoice_id ON gl_posting_queue(invoice_id);
    `);

    // Create billing_letters table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_letters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        letter_number VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL DEFAULT 'receivable',
        customer_id UUID,
        customer_name VARCHAR(255),
        supplier_id UUID,
        supplier_name VARCHAR(255),
        issue_date DATE NOT NULL,
        due_date DATE,
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'outstanding',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Billing letter items (linked invoices)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_letter_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        billing_letter_id UUID NOT NULL REFERENCES billing_letters(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL,
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE,
        due_date DATE,
        amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        outstanding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        days_overdue INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_letters_status ON billing_letters(status);
      CREATE INDEX IF NOT EXISTS idx_billing_letters_customer ON billing_letters(customer_id);
      CREATE INDEX IF NOT EXISTS idx_billing_letters_supplier ON billing_letters(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_billing_letter_items_letter ON billing_letter_items(billing_letter_id);
      CREATE INDEX IF NOT EXISTS idx_billing_letter_items_invoice ON billing_letter_items(invoice_id);
    `);

    // Permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('billing-letters:read', 'billing-letters', 'read'),
        ('billing-letters:create', 'billing-letters', 'create'),
        ('billing-letters:update', 'billing-letters', 'update')
      ON CONFLICT (name) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'finance_manager', 'accountant')
        AND p.name IN ('billing-letters:read', 'billing-letters:create', 'billing-letters:update')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_billing_letter_items_invoice;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_billing_letter_items_letter;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_billing_letters_supplier;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_billing_letters_customer;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_billing_letters_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_letter_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_letters;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gl_posting_queue_invoice_id;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_invoice_id;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ap_subsidiary_invoice;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_subsidiary_invoice;`);
    await queryRunner.query(
      `ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS invoice_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS invoice_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE ap_subsidiary_ledger DROP COLUMN IF EXISTS invoice_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE ar_subsidiary_ledger DROP COLUMN IF EXISTS invoice_id;`,
    );
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('billing-letters:read', 'billing-letters:create', 'billing-letters:update')
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('billing-letters:read', 'billing-letters:create', 'billing-letters:update');
    `);
  }
}
