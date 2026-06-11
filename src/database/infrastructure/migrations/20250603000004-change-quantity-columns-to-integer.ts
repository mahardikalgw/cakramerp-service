import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeQuantityColumnsToInteger20250603000002 implements MigrationInterface {
  name = 'ChangeQuantityColumnsToInteger20250603000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure all columns exist before ALTER TYPE (safeguard for IF NOT EXISTS tables)
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS delivered_quantity NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS po_qty NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS received_qty NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS discrepancy_qty NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS balance_after NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE stock_opname_lines ADD COLUMN IF NOT EXISTS system_qty NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE stock_opname_lines ADD COLUMN IF NOT EXISTS actual_qty NUMERIC(18,4) DEFAULT 0;
      ALTER TABLE stock_opname_lines ADD COLUMN IF NOT EXISTS variance_qty NUMERIC(18,4) DEFAULT 0;
    `);

    // ─── PURCHASING TABLES ─────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE purchase_request_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL,
        ALTER COLUMN received_quantity TYPE INTEGER USING received_quantity::INTEGER,
        ALTER COLUMN received_quantity SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_return_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    // ─── SALES TABLES ─────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE quotation_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL,
        ALTER COLUMN delivered_quantity TYPE INTEGER USING delivered_quantity::INTEGER,
        ALTER COLUMN delivered_quantity SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE sales_return_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    // ─── WAREHOUSE TABLES ─────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE goods_receipt_lines
        ALTER COLUMN po_qty TYPE INTEGER USING po_qty::INTEGER,
        ALTER COLUMN po_qty SET NOT NULL,
        ALTER COLUMN received_qty TYPE INTEGER USING received_qty::INTEGER,
        ALTER COLUMN received_qty SET NOT NULL,
        ALTER COLUMN discrepancy_qty TYPE INTEGER USING discrepancy_qty::INTEGER,
        ALTER COLUMN discrepancy_qty SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuance_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_ledger
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL,
        ALTER COLUMN balance_after TYPE INTEGER USING balance_after::INTEGER,
        ALTER COLUMN balance_after SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE stock_opname_lines
        ALTER COLUMN system_qty TYPE INTEGER USING system_qty::INTEGER,
        ALTER COLUMN system_qty SET NOT NULL,
        ALTER COLUMN actual_qty TYPE INTEGER USING actual_qty::INTEGER,
        ALTER COLUMN actual_qty SET NOT NULL,
        ALTER COLUMN variance_qty TYPE INTEGER USING variance_qty::INTEGER,
        ALTER COLUMN variance_qty SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE item_stock_balances
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);

    // ─── FINANCE TABLES ───────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE ar_invoice_lines
        ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
        ALTER COLUMN quantity SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert all quantity columns back to NUMERIC(18,4)

    await queryRunner.query(`
      ALTER TABLE ar_invoice_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE item_stock_balances
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE stock_opname_lines
        ALTER COLUMN system_qty TYPE NUMERIC(18,4),
        ALTER COLUMN actual_qty TYPE NUMERIC(18,4),
        ALTER COLUMN variance_qty TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE stock_ledger
        ALTER COLUMN quantity TYPE NUMERIC(18,4),
        ALTER COLUMN balance_after TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE stock_issuance_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE goods_receipt_lines
        ALTER COLUMN po_qty TYPE NUMERIC(18,4),
        ALTER COLUMN received_qty TYPE NUMERIC(18,4),
        ALTER COLUMN discrepancy_qty TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE sales_return_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4),
        ALTER COLUMN delivered_quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE quotation_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_return_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4),
        ALTER COLUMN received_quantity TYPE NUMERIC(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE purchase_request_lines
        ALTER COLUMN quantity TYPE NUMERIC(18,4)
    `);
  }
}
