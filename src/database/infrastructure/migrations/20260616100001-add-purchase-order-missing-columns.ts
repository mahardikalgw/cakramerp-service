import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderMissingColumns20260616100001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN IF NOT EXISTS payment_term_days integer NOT NULL DEFAULT 30,
        ADD COLUMN IF NOT EXISTS payment_term_label varchar(255),
        ADD COLUMN IF NOT EXISTS approved_by uuid,
        ADD COLUMN IF NOT EXISTS approved_at timestamp,
        ADD COLUMN IF NOT EXISTS rejection_reason text,
        ADD COLUMN IF NOT EXISTS gl_posting_queue_id uuid,
        ADD COLUMN IF NOT EXISTS journal_entry_id uuid
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
        DROP COLUMN IF EXISTS payment_term_days,
        DROP COLUMN IF EXISTS payment_term_label,
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS approved_at,
        DROP COLUMN IF EXISTS rejection_reason,
        DROP COLUMN IF EXISTS gl_posting_queue_id,
        DROP COLUMN IF EXISTS journal_entry_id
    `);
  }
}
