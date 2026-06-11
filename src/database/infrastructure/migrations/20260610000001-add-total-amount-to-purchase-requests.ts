import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTotalAmountToPurchaseRequests20260610000001 implements MigrationInterface {
  name = 'AddTotalAmountToPurchaseRequests20260610000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_requests
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_requests
        DROP COLUMN IF EXISTS total_amount
    `);
  }
}
