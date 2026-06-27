import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownPaymentToSalesOrders1718668800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(18,2) DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE testing_requests ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(18,2) DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE testing_requests DROP COLUMN IF EXISTS down_payment_amount;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_orders DROP COLUMN IF EXISTS down_payment_amount;`,
    );
  }
}
