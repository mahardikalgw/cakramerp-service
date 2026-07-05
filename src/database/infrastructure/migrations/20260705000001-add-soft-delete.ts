import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDelete20260705000001 implements MigrationInterface {
  name = 'AddSoftDelete20260705000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── IAM pivot tables (needed by TypeORM @DeleteDateColumn join queries) ──
    await queryRunner.query(
      `ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );

    // ── Core business tables ──────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE positions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_positions_deleted_at ON positions (deleted_at);`,
    );

    // ── Sales ─────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_quotations_deleted_at ON quotations (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE quotation_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_quotation_lines_deleted_at ON quotation_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sales_orders_deleted_at ON sales_orders (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sales_order_lines_deleted_at ON sales_order_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sales_returns_deleted_at ON sales_returns (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE sales_return_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sales_return_lines_deleted_at ON sales_return_lines (deleted_at);`,
    );

    // ── Purchasing ────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_requests_deleted_at ON purchase_requests (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_request_lines_deleted_at ON purchase_request_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at ON purchase_orders (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_deleted_at ON purchase_order_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_returns_deleted_at ON purchase_returns (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_return_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_purchase_return_lines_deleted_at ON purchase_return_lines (deleted_at);`,
    );

    // ── Finance ───────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted_at ON journal_entries (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_deleted_at ON journal_entry_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ar_invoices_deleted_at ON ar_invoices (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE ap_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ap_payments_deleted_at ON ap_payments (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at);`,
    );

    // ── Warehouse ─────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_goods_receipts_deleted_at ON goods_receipts (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_deleted_at ON goods_receipt_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_deleted_at ON stock_movements (deleted_at);`,
    );

    // ── HR ────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payroll_runs_deleted_at ON payroll_runs (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payroll_details_deleted_at ON payroll_details (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE thr_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_thr_records_deleted_at ON thr_records (deleted_at);`,
    );

    // ── Asset ─────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE asset_depreciations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_asset_depreciations_deleted_at ON asset_depreciations (deleted_at);`,
    );

    // ── Laboratory ────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE testing_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_requests_deleted_at ON testing_requests (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE testing_request_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_request_lines_deleted_at ON testing_request_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE lab_purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_purchase_orders_deleted_at ON lab_purchase_orders (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE lab_purchase_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_purchase_order_lines_deleted_at ON lab_purchase_order_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE post_approval_lab_contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_post_approval_lab_contracts_deleted_at ON post_approval_lab_contracts (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE post_approval_lab_contract_samples ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_post_approval_lab_contract_samples_deleted_at ON post_approval_lab_contract_samples (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE testing_schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_schedules_deleted_at ON testing_schedules (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_test_results_deleted_at ON test_results (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_daily_reports_deleted_at ON daily_reports (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE daily_report_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_daily_report_lines_deleted_at ON daily_report_lines (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE samples ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_samples_deleted_at ON samples (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE lab_schedule_samples ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_schedule_samples_deleted_at ON lab_schedule_samples (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE contract_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contract_invoices_deleted_at ON contract_invoices (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE contract_test_invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_contract_test_invoices_deleted_at ON contract_test_invoices (deleted_at);`,
    );

    await queryRunner.query(
      `ALTER TABLE lab_certificates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_certificates_deleted_at ON lab_certificates (deleted_at);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Laboratory ────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_lab_certificates_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_certificates DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_contract_test_invoices_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE contract_test_invoices DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_contract_invoices_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE contract_invoices DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_lab_schedule_samples_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_schedule_samples DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_samples_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE samples DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_daily_report_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE daily_report_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_daily_reports_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE daily_reports DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_test_results_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE test_results DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_schedules_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE testing_schedules DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_post_approval_lab_contract_samples_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE post_approval_lab_contract_samples DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_post_approval_lab_contracts_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE post_approval_lab_contracts DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_lab_purchase_order_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_purchase_order_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_lab_purchase_orders_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_purchase_orders DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_request_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE testing_request_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_requests_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE testing_requests DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Asset ─────────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_asset_depreciations_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE asset_depreciations DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE assets DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── HR ────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_thr_records_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE thr_records DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payroll_details_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE payroll_details DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payroll_runs_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE payroll_runs DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Warehouse ─────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_movements_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_goods_receipt_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipt_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_goods_receipts_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipts DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE items DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Finance ───────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ap_payments_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE ap_payments DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_ar_invoices_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE ar_invoices DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_accounts_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE accounts DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entry_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entry_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Purchasing ────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_return_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_return_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_returns_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_returns DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_order_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_order_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_orders_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_orders DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_request_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_request_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requests_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_requests DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Sales ─────────────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_return_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_return_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_returns_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_returns DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_order_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_order_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sales_orders_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_orders DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_quotation_lines_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE quotation_lines DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_quotations_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE quotations DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── Core business tables ──────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS idx_positions_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE positions DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_departments_deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE departments DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_employees_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE employees DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_suppliers_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE suppliers DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_customers_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE customers DROP COLUMN IF EXISTS deleted_at;`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;`,
    );

    // ── IAM pivot tables ──────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE role_permissions DROP COLUMN IF EXISTS deleted_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE user_roles DROP COLUMN IF EXISTS deleted_at;`,
    );
  }
}
