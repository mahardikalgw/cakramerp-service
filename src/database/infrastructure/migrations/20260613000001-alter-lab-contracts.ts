import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterLabContracts20260613000001 implements MigrationInterface {
  name = 'AlterLabContracts20260613000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS testing_request_id UUID REFERENCES testing_requests(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS project_location VARCHAR(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS testing_type VARCHAR(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS billing_type VARCHAR(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS base_amount DECIMAL(18,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) NOT NULL DEFAULT 11`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS total_amount DECIMAL(18,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS contract_document_url VARCHAR(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS tax_invoice_url VARCHAR(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS generated_by UUID`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS generated_by_name VARCHAR(255)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_contracts_request ON lab_contracts(testing_request_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_contracts_status ON lab_contracts(status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_contracts_customer ON lab_contracts(customer_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS testing_request_id`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS project_location`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS testing_type`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS billing_type`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS base_amount`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS tax_percent`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS tax_amount`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS total_amount`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS contract_document_url`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS tax_invoice_url`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS generated_at`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS generated_by`,
    );
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS generated_by_name`,
    );
  }
}
