import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendArInvoicesForLabBilling20260806000001 implements MigrationInterface {
  name = 'ExtendArInvoicesForLabBilling20260806000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend `ar_invoices` so it becomes the single source of truth for ALL
    // billing types (sales, lab cash, lab contract). Lab-specific concepts
    // previously held only in `contract_test_invoices` (initial fee credit,
    // amount due, payment proof + admin verification, schedule/contract link)
    // are now stored on the AR invoice itself.

    await queryRunner.query(`
      ALTER TABLE ar_invoices
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS source_id UUID NULL,
        ADD COLUMN IF NOT EXISTS contract_id UUID NULL,
        ADD COLUMN IF NOT EXISTS testing_schedule_id UUID NULL,
        ADD COLUMN IF NOT EXISTS billing_period_start DATE NULL,
        ADD COLUMN IF NOT EXISTS billing_period_end DATE NULL,
        ADD COLUMN IF NOT EXISTS total_samples INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS initial_fee_applied NUMERIC(18,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS amount_due NUMERIC(18,2) NULL,
        ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS invoice_document_url VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS payment_proof_filename VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS payment_verified_by VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS payment_verified_by_name VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_source_type
        ON ar_invoices(source_type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_source_id
        ON ar_invoices(source_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_contract
        ON ar_invoices(contract_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_invoices_schedule
        ON ar_invoices(testing_schedule_id)
    `);

    // Extend `ar_invoice_lines` so lab contract invoices can reference the
    // individual test result (and its sample code) that each line bills.
    await queryRunner.query(`
      ALTER TABLE ar_invoice_lines
        ADD COLUMN IF NOT EXISTS test_result_id UUID NULL,
        ADD COLUMN IF NOT EXISTS sample_code VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_invoice_lines_test_result
        ON ar_invoice_lines(test_result_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ar_invoice_lines_test_result`,
    );
    await queryRunner.query(`
      ALTER TABLE ar_invoice_lines
        DROP COLUMN IF EXISTS test_result_id,
        DROP COLUMN IF EXISTS sample_code
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_invoices_schedule`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_invoices_contract`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_invoices_source_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ar_invoices_source_type`);

    await queryRunner.query(`
      ALTER TABLE ar_invoices
        DROP COLUMN IF EXISTS payment_verified_by_name,
        DROP COLUMN IF EXISTS payment_verified_by,
        DROP COLUMN IF EXISTS payment_verified_at,
        DROP COLUMN IF EXISTS payment_proof_uploaded_at,
        DROP COLUMN IF EXISTS payment_proof_filename,
        DROP COLUMN IF EXISTS payment_proof_url,
        DROP COLUMN IF EXISTS invoice_document_url,
        DROP COLUMN IF EXISTS paid_at,
        DROP COLUMN IF EXISTS issued_at,
        DROP COLUMN IF EXISTS amount_due,
        DROP COLUMN IF EXISTS initial_fee_applied,
        DROP COLUMN IF EXISTS total_samples,
        DROP COLUMN IF EXISTS billing_period_end,
        DROP COLUMN IF EXISTS billing_period_start,
        DROP COLUMN IF EXISTS testing_schedule_id,
        DROP COLUMN IF EXISTS contract_id,
        DROP COLUMN IF EXISTS source_id,
        DROP COLUMN IF EXISTS source_type
    `);
  }
}
