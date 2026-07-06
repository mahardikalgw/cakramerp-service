import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add deleted_at column to laboratory tables that were not covered by the
 * previous soft-delete migrations, plus sales line tables which are now
 * soft-deleted instead of hard-deleted.
 *
 * New tables covered:
 *   Laboratory:
 *     - archived_documents
 *     - closing_checklist_items
 *     - closings
 *     - contract_test_invoice_results
 *     - lab_certificates
 *     - lab_contract_attachments
 *     - laboratory (laboratories table)
 *     - payment_evidences
 *     - payment_methods
 *     - report_distributions
 *     - sample_quotas
 *     - sample_types
 *     - test_result_attachments
 *     - testing_services
 *     - verification_checklist_items
 *     - verifications
 *   Sales (line tables now soft-deleted on update):
 *     - quotation_lines   (already in migration 1 — ADD IF NOT EXISTS is safe)
 *     - sales_order_lines (already in migration 1 — ADD IF NOT EXISTS is safe)
 *     - sales_return_lines (already in migration 1 — ADD IF NOT EXISTS is safe)
 */
export class AddSoftDeleteRemainingTables20260706000003 implements MigrationInterface {
  name = 'AddSoftDeleteRemainingTables20260706000003';

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        ) THEN
          ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
          CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table} (deleted_at);
        END IF;
      END $$;
    `);
  }

  private async dropColumn(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        ) THEN
          DROP INDEX IF EXISTS idx_${table}_deleted_at;
          ALTER TABLE ${table} DROP COLUMN IF EXISTS deleted_at;
        END IF;
      END $$;
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Laboratory — previously missed tables ──────────────────────────────
    await this.addColumn(queryRunner, 'archived_documents');
    await this.addColumn(queryRunner, 'closing_checklist_items');
    await this.addColumn(queryRunner, 'closings');
    await this.addColumn(queryRunner, 'contract_test_invoice_results');
    await this.addColumn(queryRunner, 'lab_certificates');
    await this.addColumn(queryRunner, 'lab_contract_attachments');
    await this.addColumn(queryRunner, 'laboratories');
    await this.addColumn(queryRunner, 'payment_evidences');
    await this.addColumn(queryRunner, 'payment_methods');
    await this.addColumn(queryRunner, 'report_distributions');
    await this.addColumn(queryRunner, 'sample_quotas');
    await this.addColumn(queryRunner, 'sample_types');
    await this.addColumn(queryRunner, 'test_result_attachments');
    await this.addColumn(queryRunner, 'testing_services');
    await this.addColumn(queryRunner, 'verification_checklist_items');
    await this.addColumn(queryRunner, 'verifications');

    // ── Sales line tables — safe to re-run (ADD COLUMN IF NOT EXISTS) ──────
    await this.addColumn(queryRunner, 'quotation_lines');
    await this.addColumn(queryRunner, 'sales_order_lines');
    await this.addColumn(queryRunner, 'sales_return_lines');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumn(queryRunner, 'sales_return_lines');
    await this.dropColumn(queryRunner, 'sales_order_lines');
    await this.dropColumn(queryRunner, 'quotation_lines');
    await this.dropColumn(queryRunner, 'verifications');
    await this.dropColumn(queryRunner, 'verification_checklist_items');
    await this.dropColumn(queryRunner, 'testing_services');
    await this.dropColumn(queryRunner, 'test_result_attachments');
    await this.dropColumn(queryRunner, 'sample_types');
    await this.dropColumn(queryRunner, 'sample_quotas');
    await this.dropColumn(queryRunner, 'report_distributions');
    await this.dropColumn(queryRunner, 'payment_methods');
    await this.dropColumn(queryRunner, 'payment_evidences');
    await this.dropColumn(queryRunner, 'laboratories');
    await this.dropColumn(queryRunner, 'lab_contract_attachments');
    await this.dropColumn(queryRunner, 'lab_certificates');
    await this.dropColumn(queryRunner, 'contract_test_invoice_results');
    await this.dropColumn(queryRunner, 'closings');
    await this.dropColumn(queryRunner, 'closing_checklist_items');
    await this.dropColumn(queryRunner, 'archived_documents');
  }
}
