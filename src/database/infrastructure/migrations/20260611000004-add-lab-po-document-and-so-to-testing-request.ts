import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLabPODocumentAndSalesOrderId20260611000004 implements MigrationInterface {
  name = 'AddLabPODocumentAndSalesOrderId20260611000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_purchase_orders
        ADD COLUMN IF NOT EXISTS document_url TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS sales_order_id UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS sales_order_id
    `);

    await queryRunner.query(`
      ALTER TABLE lab_purchase_orders
        DROP COLUMN IF EXISTS document_url
    `);
  }
}
