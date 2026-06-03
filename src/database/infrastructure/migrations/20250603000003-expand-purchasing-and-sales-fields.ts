import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPurchasingAndSalesFields20250603000003
  implements MigrationInterface
{
  name = 'ExpandPurchasingAndSalesFields20250603000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── PURCHASING: Add amount breakdowns to PO/PR ────────────────────

    await queryRunner.query(`
      ALTER TABLE purchase_requests
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,2) DEFAULT 0
    `);

    // ─── PURCHASING: Add approval fields to returns ────────────────────

    await queryRunner.query(`
      ALTER TABLE purchase_returns
        ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    // ─── PURCHASING: Add tax to PO lines ──────────────────────────────

    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_request_lines
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0
    `);

    // ─── SALES: Add approval fields to SO and returns ──────────────────

    await queryRunner.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE sales_returns
        ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    // ─── SALES: Add discount to SO lines ───────────────────────────────

    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE quotation_lines
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0
    `);

    // ─── Add index on priority ─────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pr_priority ON purchase_requests(priority);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pr_priority`);

    await queryRunner.query(`
      ALTER TABLE quotation_lines DROP COLUMN IF EXISTS discount_amount
    `);
    await queryRunner.query(`
      ALTER TABLE sales_order_lines DROP COLUMN IF EXISTS discount_amount
    `);

    await queryRunner.query(`
      ALTER TABLE sales_returns
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS approved_at,
        DROP COLUMN IF EXISTS rejection_reason
    `);
    await queryRunner.query(`
      ALTER TABLE sales_orders
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS approved_at,
        DROP COLUMN IF EXISTS rejection_reason
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_request_lines DROP COLUMN IF EXISTS tax_percent
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        DROP COLUMN IF EXISTS tax_percent,
        DROP COLUMN IF EXISTS tax_amount,
        DROP COLUMN IF EXISTS discount_amount
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_returns
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS approved_at,
        DROP COLUMN IF EXISTS rejection_reason
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_orders
        DROP COLUMN IF EXISTS discount_amount,
        DROP COLUMN IF EXISTS tax_amount,
        DROP COLUMN IF EXISTS grand_total
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_requests
        DROP COLUMN IF EXISTS priority,
        DROP COLUMN IF EXISTS discount_amount,
        DROP COLUMN IF EXISTS tax_amount,
        DROP COLUMN IF EXISTS grand_total
    `);
  }
}
