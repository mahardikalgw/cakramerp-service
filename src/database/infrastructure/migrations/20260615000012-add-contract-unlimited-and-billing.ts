import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractUnlimitedAndBilling20260615000012 implements MigrationInterface {
  name = 'AddContractUnlimitedAndBilling20260615000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS billing_start_date DATE,
        ADD COLUMN IF NOT EXISTS last_billing_date DATE,
        ADD COLUMN IF NOT EXISTS scope_of_testing TEXT,
        ADD COLUMN IF NOT EXISTS contract_estimation INTEGER,
        ADD COLUMN IF NOT EXISTS contract_tempo_months INTEGER,
        ADD COLUMN IF NOT EXISTS signed_contract_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS contract_signing_deadline TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contract_confirmed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contract_confirmed_by VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        DROP COLUMN IF EXISTS is_unlimited,
        DROP COLUMN IF EXISTS billing_start_date,
        DROP COLUMN IF EXISTS last_billing_date,
        DROP COLUMN IF EXISTS scope_of_testing,
        DROP COLUMN IF EXISTS contract_estimation,
        DROP COLUMN IF EXISTS contract_tempo_months,
        DROP COLUMN IF EXISTS signed_contract_url,
        DROP COLUMN IF EXISTS contract_signing_deadline,
        DROP COLUMN IF EXISTS contract_confirmed_at,
        DROP COLUMN IF EXISTS contract_confirmed_by
    `);
  }
}
