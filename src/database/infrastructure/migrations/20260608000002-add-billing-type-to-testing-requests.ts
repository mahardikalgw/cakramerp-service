import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingTypeToTestingRequests20260608000002 implements MigrationInterface {
  name = 'AddBillingTypeToTestingRequests20260608000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS lab_contract_id UUID,
        ADD COLUMN IF NOT EXISTS lab_purchase_order_id UUID
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_requests_billing_type ON testing_requests(billing_type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_requests_lab_contract ON testing_requests(lab_contract_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_requests_lab_po ON testing_requests(lab_purchase_order_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_testing_requests_lab_po`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_requests_lab_contract`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_testing_requests_billing_type`,
    );
    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS billing_type,
        DROP COLUMN IF EXISTS lab_contract_id,
        DROP COLUMN IF EXISTS lab_purchase_order_id
    `);
  }
}
