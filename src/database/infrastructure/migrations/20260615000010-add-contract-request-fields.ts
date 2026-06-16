import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractRequestFields20260615000010 implements MigrationInterface {
  name = 'AddContractRequestFields20260615000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS scope_of_testing TEXT,
        ADD COLUMN IF NOT EXISTS contract_estimation INTEGER,
        ADD COLUMN IF NOT EXISTS contract_tempo_months INTEGER,
        ADD COLUMN IF NOT EXISTS signed_contract_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS signed_contract_uploaded_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contract_signing_deadline TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contract_confirmed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS contract_confirmed_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_requests_signing_deadline
        ON testing_requests(contract_signing_deadline)
        WHERE status = 'approved' AND billing_type = 'contract'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_testing_requests_signing_deadline`);
    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS scope_of_testing,
        DROP COLUMN IF EXISTS contract_estimation,
        DROP COLUMN IF EXISTS contract_tempo_months,
        DROP COLUMN IF EXISTS signed_contract_url,
        DROP COLUMN IF EXISTS signed_contract_uploaded_at,
        DROP COLUMN IF EXISTS contract_signing_deadline,
        DROP COLUMN IF EXISTS contract_confirmed_at,
        DROP COLUMN IF EXISTS contract_confirmed_by,
        DROP COLUMN IF EXISTS is_unlimited
    `);
  }
}
