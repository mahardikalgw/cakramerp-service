import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add deleted_at column to lab tables that were missing from the initial
 * add-soft-delete migration (20260705000001).
 *
 * Tables covered by this migration:
 *   - lab_contracts
 *   - lab_contract_samples
 *   - document_archives
 *   - lab_contract_attachments
 *   - contract_test_invoice_results
 *   - archived_documents
 *   - closings
 *   - closing_checklist_items
 *   - verifications
 *   - verification_checklist_items
 *   - report_distributions
 *   - payment_evidences
 *   - payment_methods
 *   - laboratories
 *   - testing_services
 *   - lab_activity_logs
 *   - lab_certificates (extra safety - already in migration 1 but using IF NOT EXISTS)
 */
export class AddSoftDeleteMissingLabTables20260706000001
  implements MigrationInterface
{
  name = 'AddSoftDeleteMissingLabTables20260706000001';

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
    await this.addColumn(queryRunner, 'lab_contracts');
    await this.addColumn(queryRunner, 'lab_contract_samples');
    await this.addColumn(queryRunner, 'document_archives');
    await this.addColumn(queryRunner, 'lab_contract_attachments');
    await this.addColumn(queryRunner, 'contract_test_invoice_results');
    await this.addColumn(queryRunner, 'archived_documents');
    await this.addColumn(queryRunner, 'closings');
    await this.addColumn(queryRunner, 'closing_checklist_items');
    await this.addColumn(queryRunner, 'verifications');
    await this.addColumn(queryRunner, 'verification_checklist_items');
    await this.addColumn(queryRunner, 'report_distributions');
    await this.addColumn(queryRunner, 'payment_evidences');
    await this.addColumn(queryRunner, 'payment_methods');
    await this.addColumn(queryRunner, 'laboratories');
    await this.addColumn(queryRunner, 'testing_services');
    await this.addColumn(queryRunner, 'lab_activity_logs');
    await this.addColumn(queryRunner, 'sample_quotas');
    await this.addColumn(queryRunner, 'sample_types');
    await this.addColumn(queryRunner, 'test_result_attachments');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumn(queryRunner, 'test_result_attachments');
    await this.dropColumn(queryRunner, 'sample_types');
    await this.dropColumn(queryRunner, 'sample_quotas');
    await this.dropColumn(queryRunner, 'lab_activity_logs');
    await this.dropColumn(queryRunner, 'testing_services');
    await this.dropColumn(queryRunner, 'laboratories');
    await this.dropColumn(queryRunner, 'payment_methods');
    await this.dropColumn(queryRunner, 'payment_evidences');
    await this.dropColumn(queryRunner, 'report_distributions');
    await this.dropColumn(queryRunner, 'verification_checklist_items');
    await this.dropColumn(queryRunner, 'verifications');
    await this.dropColumn(queryRunner, 'closing_checklist_items');
    await this.dropColumn(queryRunner, 'closings');
    await this.dropColumn(queryRunner, 'archived_documents');
    await this.dropColumn(queryRunner, 'contract_test_invoice_results');
    await this.dropColumn(queryRunner, 'lab_contract_attachments');
    await this.dropColumn(queryRunner, 'document_archives');
    await this.dropColumn(queryRunner, 'lab_contract_samples');
    await this.dropColumn(queryRunner, 'lab_contracts');
  }
}
