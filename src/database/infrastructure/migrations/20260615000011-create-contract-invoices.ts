import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractInvoices20260615000011 implements MigrationInterface {
  name = 'CreateContractInvoices20260615000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contract_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        contract_id UUID NOT NULL REFERENCES lab_contracts(id) ON DELETE RESTRICT,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        total_samples INTEGER NOT NULL DEFAULT 0,
        base_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        tax_percent DECIMAL(5,2) NOT NULL DEFAULT 11,
        tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        invoice_document_url VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'issued',
        paid_at TIMESTAMPTZ,
        paid_amount DECIMAL(18,2),
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_invoices_contract ON contract_invoices(contract_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_invoices_status ON contract_invoices(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_contract_invoices_period ON contract_invoices(billing_period_start, billing_period_end)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contract_invoices`);
  }
}
