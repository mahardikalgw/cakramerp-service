import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceCustomerForLab20250604000002 implements MigrationInterface {
  name = 'EnhanceCustomerForLab20250604000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'contract',
      ADD COLUMN IF NOT EXISTS default_contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS default_contact_phone VARCHAR(50);
    `);

    // Add check constraint for contract_type
    await queryRunner.query(`
      ALTER TABLE customers 
      DROP CONSTRAINT IF EXISTS chk_customers_contract_type,
      ADD CONSTRAINT chk_customers_contract_type 
      CHECK (contract_type IN ('contract', 'po_cash'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers 
      DROP CONSTRAINT IF EXISTS chk_customers_contract_type,
      DROP COLUMN IF EXISTS contract_type,
      DROP COLUMN IF EXISTS default_contact_email,
      DROP COLUMN IF EXISTS default_contact_phone;
    `);
  }
}
