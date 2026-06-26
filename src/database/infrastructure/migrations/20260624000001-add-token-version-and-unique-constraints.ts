import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionAndUniqueConstraints1719864000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add token_version column to users table for session revocation
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
    `);

    // Add unique index on sales_orders.quotation_id to prevent duplicate conversions
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_quotation_id
        ON sales_orders (quotation_id)
        WHERE quotation_id IS NOT NULL;
    `);

    // Add unique index on purchase_orders.purchase_request_id to prevent duplicate conversions
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_request_id
        ON purchase_orders (purchase_request_id)
        WHERE purchase_request_id IS NOT NULL;
    `);

    // Add CHECK constraint on item_stock_balances to prevent negative stock
    await queryRunner.query(`
      ALTER TABLE item_stock_balances DROP CONSTRAINT IF EXISTS ck_stock_balance_non_negative;
    `);
    await queryRunner.query(`
      ALTER TABLE item_stock_balances ADD CONSTRAINT ck_stock_balance_non_negative
        CHECK (quantity >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE item_stock_balances DROP CONSTRAINT IF EXISTS ck_stock_balance_non_negative`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_orders_request_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_orders_quotation_id`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS token_version`);
  }
}
