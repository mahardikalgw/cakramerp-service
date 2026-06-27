import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractTestInvoices20260626000002 implements MigrationInterface {
  name = 'CreateContractTestInvoices20260626000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── CONTRACT TEST INVOICES ──────────────────────────────────────
    // One invoice per (contract, schedule, billing period) that bills the
    // customer for confirmed test results generated under that schedule.
    // The contract's `initial_fee` is applied as a credit; if it covers the
    // full amount the invoice is auto-marked paid, otherwise the customer
    // sees the remaining `amount_due` and can upload proof of payment.

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_test_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        contract_id UUID NOT NULL REFERENCES lab_contracts(id) ON DELETE RESTRICT,
        testing_schedule_id UUID REFERENCES testing_schedules(id) ON DELETE SET NULL,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        total_samples INTEGER NOT NULL DEFAULT 0,
        base_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        tax_percent NUMERIC(5,2) NOT NULL DEFAULT 11,
        tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        initial_fee_applied NUMERIC(18,2) NOT NULL DEFAULT 0,
        amount_due NUMERIC(18,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        due_date DATE,
        issued_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        paid_amount NUMERIC(18,2),
        invoice_document_url VARCHAR(500),
        payment_proof_url VARCHAR(500),
        payment_proof_filename VARCHAR(255),
        payment_proof_uploaded_at TIMESTAMPTZ,
        payment_verified_at TIMESTAMPTZ,
        payment_verified_by VARCHAR(255),
        payment_verified_by_name VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_test_invoices_contract
        ON contract_test_invoices(contract_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_test_invoices_schedule
        ON contract_test_invoices(testing_schedule_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_test_invoices_status
        ON contract_test_invoices(status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_test_invoices_period
        ON contract_test_invoices(billing_period_start, billing_period_end)
    `);

    // ─── JUNCTION: line items per invoice ────────────────────────────
    // Each row references the individual test result that contributed to
    // the invoice, so the customer (and admin) can see exactly which tests
    // they're being billed for.

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_test_invoice_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES contract_test_invoices(id) ON DELETE CASCADE,
        test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE RESTRICT,
        service_name VARCHAR(255),
        sample_code VARCHAR(255),
        unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price NUMERIC(18,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_test_invoice_results_invoice
        ON contract_test_invoice_results(invoice_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_test_invoice_results_result
        ON contract_test_invoice_results(test_result_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS contract_test_invoice_results`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS contract_test_invoices`);
  }
}
