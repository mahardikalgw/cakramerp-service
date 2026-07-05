import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDelete20260705000001 implements MigrationInterface {
  name = 'AddSoftDelete20260705000001';

  private async addColumn(queryRunner: QueryRunner, table: string): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}') THEN
          ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
          CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table} (deleted_at);
        END IF;
      END $$;
    `);
  }

  private async dropColumn(queryRunner: QueryRunner, table: string): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}') THEN
          DROP INDEX IF EXISTS idx_${table}_deleted_at;
          ALTER TABLE ${table} DROP COLUMN IF EXISTS deleted_at;
        END IF;
      END $$;
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── IAM pivot tables ──────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'user_roles');
    await this.addColumn(queryRunner, 'role_permissions');

    // ── Core business tables ──────────────────────────────────────────────
    await this.addColumn(queryRunner, 'users');
    await this.addColumn(queryRunner, 'customers');
    await this.addColumn(queryRunner, 'suppliers');
    await this.addColumn(queryRunner, 'employees');
    await this.addColumn(queryRunner, 'departments');
    await this.addColumn(queryRunner, 'positions');

    // ── Sales ─────────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'quotations');
    await this.addColumn(queryRunner, 'quotation_lines');
    await this.addColumn(queryRunner, 'sales_orders');
    await this.addColumn(queryRunner, 'sales_order_lines');
    await this.addColumn(queryRunner, 'sales_returns');
    await this.addColumn(queryRunner, 'sales_return_lines');

    // ── Purchasing ────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'purchase_requests');
    await this.addColumn(queryRunner, 'purchase_request_lines');
    await this.addColumn(queryRunner, 'purchase_orders');
    await this.addColumn(queryRunner, 'purchase_order_lines');
    await this.addColumn(queryRunner, 'purchase_returns');
    await this.addColumn(queryRunner, 'purchase_return_lines');

    // ── Finance ───────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'journal_entries');
    await this.addColumn(queryRunner, 'journal_entry_lines');
    await this.addColumn(queryRunner, 'accounts');
    await this.addColumn(queryRunner, 'ar_invoices');
    await this.addColumn(queryRunner, 'ap_payments');
    await this.addColumn(queryRunner, 'projects');

    // ── Warehouse ─────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'items');
    await this.addColumn(queryRunner, 'goods_receipts');
    await this.addColumn(queryRunner, 'goods_receipt_lines');
    await this.addColumn(queryRunner, 'stock_movements');

    // ── HR ────────────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'payroll_runs');
    await this.addColumn(queryRunner, 'payroll_details');
    await this.addColumn(queryRunner, 'thr_records');

    // ── Asset ─────────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'assets');
    await this.addColumn(queryRunner, 'asset_depreciations');

    // ── Laboratory ────────────────────────────────────────────────────────
    await this.addColumn(queryRunner, 'testing_requests');
    await this.addColumn(queryRunner, 'testing_request_lines');
    await this.addColumn(queryRunner, 'lab_purchase_orders');
    await this.addColumn(queryRunner, 'lab_purchase_order_lines');
    await this.addColumn(queryRunner, 'post_approval_lab_contracts');
    await this.addColumn(queryRunner, 'post_approval_lab_contract_samples');
    await this.addColumn(queryRunner, 'testing_schedules');
    await this.addColumn(queryRunner, 'test_results');
    await this.addColumn(queryRunner, 'daily_reports');
    await this.addColumn(queryRunner, 'daily_report_lines');
    await this.addColumn(queryRunner, 'samples');
    await this.addColumn(queryRunner, 'lab_schedule_samples');
    await this.addColumn(queryRunner, 'contract_invoices');
    await this.addColumn(queryRunner, 'contract_test_invoices');
    await this.addColumn(queryRunner, 'lab_certificates');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Laboratory ────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'lab_certificates');
    await this.dropColumn(queryRunner, 'contract_test_invoices');
    await this.dropColumn(queryRunner, 'contract_invoices');
    await this.dropColumn(queryRunner, 'lab_schedule_samples');
    await this.dropColumn(queryRunner, 'samples');
    await this.dropColumn(queryRunner, 'daily_report_lines');
    await this.dropColumn(queryRunner, 'daily_reports');
    await this.dropColumn(queryRunner, 'test_results');
    await this.dropColumn(queryRunner, 'testing_schedules');
    await this.dropColumn(queryRunner, 'post_approval_lab_contract_samples');
    await this.dropColumn(queryRunner, 'post_approval_lab_contracts');
    await this.dropColumn(queryRunner, 'lab_purchase_order_lines');
    await this.dropColumn(queryRunner, 'lab_purchase_orders');
    await this.dropColumn(queryRunner, 'testing_request_lines');
    await this.dropColumn(queryRunner, 'testing_requests');

    // ── Asset ─────────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'asset_depreciations');
    await this.dropColumn(queryRunner, 'assets');

    // ── HR ────────────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'thr_records');
    await this.dropColumn(queryRunner, 'payroll_details');
    await this.dropColumn(queryRunner, 'payroll_runs');

    // ── Warehouse ─────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'stock_movements');
    await this.dropColumn(queryRunner, 'goods_receipt_lines');
    await this.dropColumn(queryRunner, 'goods_receipts');
    await this.dropColumn(queryRunner, 'items');

    // ── Finance ───────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'projects');
    await this.dropColumn(queryRunner, 'ap_payments');
    await this.dropColumn(queryRunner, 'ar_invoices');
    await this.dropColumn(queryRunner, 'accounts');
    await this.dropColumn(queryRunner, 'journal_entry_lines');
    await this.dropColumn(queryRunner, 'journal_entries');

    // ── Purchasing ────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'purchase_return_lines');
    await this.dropColumn(queryRunner, 'purchase_returns');
    await this.dropColumn(queryRunner, 'purchase_order_lines');
    await this.dropColumn(queryRunner, 'purchase_orders');
    await this.dropColumn(queryRunner, 'purchase_request_lines');
    await this.dropColumn(queryRunner, 'purchase_requests');

    // ── Sales ─────────────────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'sales_return_lines');
    await this.dropColumn(queryRunner, 'sales_returns');
    await this.dropColumn(queryRunner, 'sales_order_lines');
    await this.dropColumn(queryRunner, 'sales_orders');
    await this.dropColumn(queryRunner, 'quotation_lines');
    await this.dropColumn(queryRunner, 'quotations');

    // ── Core business tables ──────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'positions');
    await this.dropColumn(queryRunner, 'departments');
    await this.dropColumn(queryRunner, 'employees');
    await this.dropColumn(queryRunner, 'suppliers');
    await this.dropColumn(queryRunner, 'customers');
    await this.dropColumn(queryRunner, 'users');

    // ── IAM pivot tables ──────────────────────────────────────────────────
    await this.dropColumn(queryRunner, 'role_permissions');
    await this.dropColumn(queryRunner, 'user_roles');
  }
}
