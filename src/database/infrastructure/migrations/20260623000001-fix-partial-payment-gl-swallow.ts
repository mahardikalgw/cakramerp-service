import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPartialPaymentGlSwallow1718784000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create ar_payments table (referenced in sales-traceability.service.ts:83 but never migrated)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ar_payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
        payment_number VARCHAR(50) NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50),
        reference VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_payments_number ON ar_payments (payment_number);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ar_payments_invoice ON ar_payments (invoice_id);
    `);

    // Step 2: Add payment_id column to gl_posting_queue
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES ar_payments(id) ON DELETE SET NULL;
    `);

    // Step 3: Drop the old single dedup index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_gl_posting_queue_dedup;
    `);

    // Step 4a: Per-payment dedup for sales_invoice / payment_received
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_posting_queue_dedup_payment
        ON gl_posting_queue (source_id, payment_id)
        WHERE source_type = 'sales_invoice'
          AND event_type = 'payment_received'
          AND status IN ('pending', 'posted');
    `);

    // Step 4b: Per-event dedup for everything else (invoice_issued, billing_letter, payment_made, etc.)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_posting_queue_dedup_event
        ON gl_posting_queue (source_type, source_id, event_type)
        WHERE NOT (source_type = 'sales_invoice' AND event_type = 'payment_received')
          AND status IN ('pending', 'posted');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gl_posting_queue_dedup_event`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gl_posting_queue_dedup_payment`,
    );
    await queryRunner.query(
      `ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS payment_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ar_payments`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_posting_queue_dedup
        ON gl_posting_queue (source_type, source_id, event_type)
        WHERE status IN ('pending', 'posted');
    `);
  }
}
