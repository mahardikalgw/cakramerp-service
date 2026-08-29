import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the legacy contract invoice tables into the single `ar_invoices`
 * source of truth, then drops the legacy tables.
 *
 *   - contract_test_invoices + contract_test_invoice_results → ar_invoices
 *     (per-schedule contract billing, incl. initial-fee credit + payment proof)
 *   - contract_invoices → ar_invoices (monthly unlimited-contract billing)
 *
 * Old primary keys are preserved so the line backfill can reuse the invoice id
 * directly and existing document/payment references stay valid.
 */
export class BackfillContractInvoicesToArInvoices20260806000002 implements MigrationInterface {
  name = 'BackfillContractInvoicesToArInvoices20260806000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. contract_test_invoices → ar_invoices ──────────────────────────
    await queryRunner.query(`
      INSERT INTO ar_invoices (
        id, invoice_number, client_id, client_name, customer_id,
        contract_id, testing_schedule_id, billing_period_start, billing_period_end,
        total_samples, amount, paid_amount, due_date, issue_date, status,
        source_type, source_id, initial_fee_applied, amount_due,
        issued_at, paid_at, invoice_document_url,
        payment_proof_url, payment_proof_filename, payment_proof_uploaded_at,
        payment_verified_at, payment_verified_by, payment_verified_by_name,
        created_at, updated_at, deleted_at
      )
      SELECT
        cti.id,
        cti.invoice_number,
        c.customer_id,
        c.customer_name,
        c.customer_id,
        cti.contract_id,
        cti.testing_schedule_id,
        cti.billing_period_start,
        cti.billing_period_end,
        cti.total_samples,
        cti.total_amount,
        COALESCE(cti.paid_amount, 0),
        COALESCE(cti.due_date, cti.issued_at::date, cti.created_at::date),
        COALESCE(cti.issued_at::date, cti.created_at::date),
        CASE cti.status WHEN 'issued' THEN 'sent' WHEN 'overdue' THEN 'sent' ELSE cti.status END,
        'lab_contract',
        cti.contract_id,
        COALESCE(cti.initial_fee_applied, 0),
        COALESCE(cti.amount_due, 0),
        cti.issued_at,
        cti.paid_at,
        cti.invoice_document_url,
        cti.payment_proof_url,
        cti.payment_proof_filename,
        cti.payment_proof_uploaded_at,
        cti.payment_verified_at,
        cti.payment_verified_by,
        cti.payment_verified_by_name,
        cti.created_at,
        cti.updated_at,
        cti.deleted_at
      FROM contract_test_invoices cti
      JOIN lab_contracts c ON c.id = cti.contract_id
      WHERE cti.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ar_invoices ai
          WHERE ai.id = cti.id OR ai.invoice_number = cti.invoice_number
        )
    `);

    // ── 2. contract_test_invoice_results → ar_invoice_lines ──────────────
    await queryRunner.query(`
      INSERT INTO ar_invoice_lines (
        id, invoice_id, description, quantity, unit_price, tax_percent, amount,
        test_result_id, sample_code, created_at, updated_at
      )
      SELECT
        ctir.id,
        ctir.invoice_id,
        COALESCE(ctir.service_name, 'Testing Service'),
        ctir.quantity,
        ctir.unit_price,
        COALESCE(cti.tax_percent, 11),
        ctir.total_price,
        ctir.test_result_id,
        ctir.sample_code,
        ctir.created_at,
        NOW()
      FROM contract_test_invoice_results ctir
      JOIN contract_test_invoices cti ON cti.id = ctir.invoice_id
      WHERE cti.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM ar_invoice_lines al WHERE al.id = ctir.id)
    `);

    // ── 3. contract_invoices (monthly) → ar_invoices ─────────────────────
    await queryRunner.query(`
      INSERT INTO ar_invoices (
        id, invoice_number, client_id, client_name, customer_id,
        contract_id, billing_period_start, billing_period_end,
        total_samples, amount, paid_amount, due_date, issue_date, status,
        source_type, source_id, initial_fee_applied, amount_due,
        paid_at, invoice_document_url,
        created_at, updated_at, deleted_at
      )
      SELECT
        ci.id,
        ci.invoice_number,
        c.customer_id,
        c.customer_name,
        c.customer_id,
        ci.contract_id,
        ci.billing_period_start,
        ci.billing_period_end,
        ci.total_samples,
        ci.total_amount,
        COALESCE(ci.paid_amount, 0),
        COALESCE((ci.created_at::date + INTERVAL '30 days')::date, NOW()::date),
        COALESCE(ci.created_at::date, NOW()::date),
        CASE ci.status WHEN 'issued' THEN 'sent' ELSE ci.status END,
        'lab_contract',
        ci.contract_id,
        0,
        GREATEST(ci.total_amount - COALESCE(ci.paid_amount, 0), 0),
        ci.paid_at,
        ci.invoice_document_url,
        ci.created_at,
        ci.updated_at,
        ci.deleted_at
      FROM contract_invoices ci
      JOIN lab_contracts c ON c.id = ci.contract_id
      WHERE ci.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ar_invoices ai
          WHERE ai.id = ci.id OR ai.invoice_number = ci.invoice_number
        )
    `);

    // ── 4. Drop the legacy tables ─────────────────────────────────────────
    await queryRunner.query(
      `DROP TABLE IF EXISTS contract_test_invoice_results`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS contract_test_invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS contract_invoices`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create the legacy tables (empty). Data migration is one-way; the
    // source rows live in ar_invoices after up().
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        contract_id UUID NOT NULL,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        total_samples INTEGER NOT NULL DEFAULT 0,
        base_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        tax_percent NUMERIC(5,2) NOT NULL DEFAULT 11,
        tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        invoice_document_url VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'issued',
        paid_at TIMESTAMPTZ,
        paid_amount NUMERIC(18,2),
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_test_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        contract_id UUID NOT NULL,
        testing_schedule_id UUID,
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
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_test_invoice_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL,
        test_result_id UUID NOT NULL,
        service_name VARCHAR(255),
        sample_code VARCHAR(255),
        unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price NUMERIC(18,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }
}
