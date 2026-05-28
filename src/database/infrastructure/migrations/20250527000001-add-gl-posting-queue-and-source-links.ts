import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGlPostingQueueAndSourceLinks20250527000001
  implements MigrationInterface
{
  name = 'AddGlPostingQueueAndSourceLinks20250527000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create gl_posting_queue table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gl_posting_queue" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "source_type" varchar(50) NOT NULL,
        "source_id" uuid NOT NULL,
        "source_number" varchar(100) NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "amount" decimal(18,2) NOT NULL,
        "description" text NOT NULL,
        "suggested_lines" jsonb,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "journal_entry_id" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_gl_posting_queue" PRIMARY KEY ("id")
      )
    `)

    // Add indexes for common queries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IX_gl_posting_queue_status" ON "gl_posting_queue" ("status")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IX_gl_posting_queue_source_type" ON "gl_posting_queue" ("source_type")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IX_gl_posting_queue_source_id" ON "gl_posting_queue" ("source_id")`)

    // Add source_type and source_id to journal_entries (for bidirectional linking)
    await queryRunner.query(`ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_type" varchar(50)`)
    await queryRunner.query(`ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_id" uuid`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IX_journal_entries_source" ON "journal_entries" ("source_type", "source_id")`)

    // Add journal_entry_id to ar_invoices (for bidirectional linking from invoice → journal)
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD COLUMN IF NOT EXISTS "journal_entry_id" uuid`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" ADD CONSTRAINT "FK_ar_invoices_journal_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL`)

    // Add journal_entry_id to ap_invoices (for bidirectional linking from invoice → journal)
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD COLUMN IF NOT EXISTS "journal_entry_id" uuid`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" ADD CONSTRAINT "FK_ap_invoices_journal_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL`)

    // Add FK from gl_posting_queue to journal_entries
    await queryRunner.query(`
      ALTER TABLE "gl_posting_queue"
      ADD CONSTRAINT "FK_gl_posting_queue_journal_entry"
      FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL
    `)

    // Add FK from gl_posting_queue to users (posted_by)
    await queryRunner.query(`
      ALTER TABLE "gl_posting_queue"
      ADD CONSTRAINT "FK_gl_posting_queue_posted_by"
      FOREIGN KEY ("posted_by") REFERENCES "users"("id") ON DELETE SET NULL
    `)

    // Seed gl_posting_queue permissions
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "resource", "action", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'gl-posting-queue:read', 'gl-posting-queue', 'read', now(), now()),
        (gen_random_uuid(), 'gl-posting-queue:create', 'gl-posting-queue', 'create', now(), now())
      ON CONFLICT (name) DO NOTHING
    `)

    // Assign new permissions to admin and finance roles
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('admin', 'finance_manager', 'accountant')
        AND p.name IN ('gl-posting-queue:read', 'gl-posting-queue:create')
      ON CONFLICT DO NOTHING
    `)

    // Seed sample gl_posting_queue entries from existing invoices
    await queryRunner.query(`
      INSERT INTO "gl_posting_queue" ("id", "source_type", "source_id", "source_number", "event_type", "amount", "description", "suggested_lines", "status", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        'sales_invoice',
        inv."id",
        inv."invoice_number",
        CASE
          WHEN inv."status" = 'sent' OR inv."status" = 'partially_paid' THEN 'invoice_issued'
          WHEN inv."status" = 'paid' THEN 'payment_received'
          ELSE 'invoice_issued'
        END,
        inv."amount" - COALESCE(inv."paid_amount", 0),
        inv."invoice_number" || ' - ' || inv."client_name",
        CASE
          WHEN inv."status" = 'paid'
          THEN jsonb_build_array(
            jsonb_build_object('accountId', '', 'accountCode', '1100', 'accountName', 'Bank / Cash', 'debit', inv."amount", 'credit', 0, 'description', 'Payment received from ' || inv."client_name"),
            jsonb_build_object('accountId', '', 'accountCode', '1200', 'accountName', 'Accounts Receivable', 'debit', 0, 'credit', inv."amount", 'description', 'Settlement of ' || inv."invoice_number")
          )
          ELSE jsonb_build_array(
            jsonb_build_object('accountId', '', 'accountCode', '1200', 'accountName', 'Accounts Receivable', 'debit', inv."amount", 'credit', 0, 'description', 'Revenue from ' || inv."invoice_number"),
            jsonb_build_object('accountId', '', 'accountCode', '4100', 'accountName', 'Sales Revenue', 'debit', 0, 'credit', inv."amount", 'description', 'Revenue on ' || inv."invoice_number")
          )
        END,
        'pending',
        now(),
        now()
      FROM "ar_invoices" inv
      WHERE inv."status" IN ('sent', 'partially_paid', 'paid')
        AND NOT EXISTS (
          SELECT 1 FROM "gl_posting_queue" q
          WHERE q."source_type" = 'sales_invoice' AND q."source_id" = inv."id"
        )
    `)

    await queryRunner.query(`
      INSERT INTO "gl_posting_queue" ("id", "source_type", "source_id", "source_number", "event_type", "amount", "description", "suggested_lines", "status", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        'supplier_invoice',
        inv."id",
        inv."invoice_number",
        CASE
          WHEN inv."status" = 'paid' THEN 'payment_made'
          ELSE 'invoice_recorded'
        END,
        inv."amount" - COALESCE(inv."paid_amount", 0),
        inv."invoice_number" || ' - ' || inv."vendor_name",
        CASE
          WHEN inv."status" = 'paid'
          THEN jsonb_build_array(
            jsonb_build_object('accountId', '', 'accountCode', '2100', 'accountName', 'Accounts Payable', 'debit', inv."amount", 'credit', 0, 'description', 'Payment to ' || inv."vendor_name"),
            jsonb_build_object('accountId', '', 'accountCode', '1100', 'accountName', 'Bank / Cash', 'debit', 0, 'credit', inv."amount", 'description', 'Payment of ' || inv."invoice_number")
          )
          ELSE jsonb_build_array(
            jsonb_build_object('accountId', '', 'accountCode', '5100', 'accountName', 'Expense / Inventory', 'debit', inv."amount", 'credit', 0, 'description', 'Purchase from ' || inv."vendor_name"),
            jsonb_build_object('accountId', '', 'accountCode', '2100', 'accountName', 'Accounts Payable', 'debit', 0, 'credit', inv."amount", 'description', 'Liability for ' || inv."invoice_number")
          )
        END,
        'pending',
        now(),
        now()
      FROM "ap_invoices" inv
      WHERE inv."status" IN ('pending', 'scheduled', 'paid')
        AND NOT EXISTS (
          SELECT 1 FROM "gl_posting_queue" q
          WHERE q."source_type" = 'supplier_invoice' AND q."source_id" = inv."id"
        )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove FK constraints
    await queryRunner.query(`ALTER TABLE "gl_posting_queue" DROP CONSTRAINT IF EXISTS "FK_gl_posting_queue_journal_entry"`)
    await queryRunner.query(`ALTER TABLE "gl_posting_queue" DROP CONSTRAINT IF EXISTS "FK_gl_posting_queue_posted_by"`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP CONSTRAINT IF EXISTS "FK_ar_invoices_journal_entry"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP CONSTRAINT IF EXISTS "FK_ap_invoices_journal_entry"`)

    // Remove columns
    await queryRunner.query(`ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "source_type"`)
    await queryRunner.query(`ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "source_id"`)
    await queryRunner.query(`ALTER TABLE "ar_invoices" DROP COLUMN IF EXISTS "journal_entry_id"`)
    await queryRunner.query(`ALTER TABLE "ap_invoices" DROP COLUMN IF EXISTS "journal_entry_id"`)

    // Remove permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE name IN ('gl-posting-queue:read', 'gl-posting-queue:create')
      )
    `)
    await queryRunner.query(`DELETE FROM "permissions" WHERE name IN ('gl-posting-queue:read', 'gl-posting-queue:create')`)

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_posting_queue"`)
  }
}