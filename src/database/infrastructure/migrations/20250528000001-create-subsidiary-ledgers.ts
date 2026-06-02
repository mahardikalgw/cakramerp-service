import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubsidiaryLedgers20250528000001 implements MigrationInterface {
  name = 'CreateSubsidiaryLedgers20250528000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // AR Subsidiary Ledger - tracks receivables per customer
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ar_subsidiary_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        journal_entry_id UUID,
        gl_posting_queue_id UUID,
        invoice_number VARCHAR(100),
        date DATE NOT NULL,
        description TEXT NOT NULL,
        debit NUMERIC(18,2) NOT NULL DEFAULT 0,
        credit NUMERIC(18,2) NOT NULL DEFAULT 0,
        balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // AP Subsidiary Ledger - tracks payables per supplier
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ap_subsidiary_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        journal_entry_id UUID,
        gl_posting_queue_id UUID,
        invoice_number VARCHAR(100),
        date DATE NOT NULL,
        description TEXT NOT NULL,
        debit NUMERIC(18,2) NOT NULL DEFAULT 0,
        credit NUMERIC(18,2) NOT NULL DEFAULT 0,
        balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_subsidiary_customer ON ar_subsidiary_ledger(customer_id);
      CREATE INDEX IF NOT EXISTS idx_ar_subsidiary_date ON ar_subsidiary_ledger(date);
      CREATE INDEX IF NOT EXISTS idx_ar_subsidiary_journal ON ar_subsidiary_ledger(journal_entry_id);
      CREATE INDEX IF NOT EXISTS idx_ap_subsidiary_supplier ON ap_subsidiary_ledger(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_ap_subsidiary_date ON ap_subsidiary_ledger(date);
      CREATE INDEX IF NOT EXISTS idx_ap_subsidiary_journal ON ap_subsidiary_ledger(journal_entry_id);
    `);

    // Add customer_id and supplier_id to gl_posting_queue for assignment before posting
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS customer_id UUID;
      ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS supplier_id UUID;
    `);

    // Seed permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('ar-subsidiary-ledger:read', 'ar-subsidiary-ledger', 'read'),
        ('ap-subsidiary-ledger:read', 'ap-subsidiary-ledger', 'read')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to admin and finance roles
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'finance_manager', 'accountant')
        AND p.name IN ('ar-subsidiary-ledger:read', 'ap-subsidiary-ledger:read')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS customer_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS supplier_id;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ap_subsidiary_journal;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ap_subsidiary_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ap_subsidiary_supplier;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_subsidiary_journal;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_subsidiary_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_subsidiary_customer;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ap_subsidiary_ledger;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ar_subsidiary_ledger;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('ar-subsidiary-ledger:read', 'ap-subsidiary-ledger:read')
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('ar-subsidiary-ledger:read', 'ap-subsidiary-ledger:read');
    `);
  }
}
