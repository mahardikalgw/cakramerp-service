import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSalesOrderSchema20260611000005 implements MigrationInterface {
  name = 'FixSalesOrderSchema20260611000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── sales_orders: rename columns to match TypeORM entity ──────────
    // order_number → so_number
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'order_number'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'so_number'
        ) THEN
          ALTER TABLE sales_orders RENAME COLUMN order_number TO so_number;
        END IF;
      END$$;
    `);

    // delivery_date → expected_delivery_date
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'delivery_date'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'expected_delivery_date'
        ) THEN
          ALTER TABLE sales_orders RENAME COLUMN delivery_date TO expected_delivery_date;
        END IF;
      END$$;
    `);

    // ─── sales_orders: add missing columns ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS quotation_id UUID,
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_term_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS payment_term_label VARCHAR(255),
        ADD COLUMN IF NOT EXISTS gl_posting_queue_id UUID,
        ADD COLUMN IF NOT EXISTS journal_entry_id UUID
    `);

    // ─── sales_order_lines: rename total_price → amount ────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_order_lines' AND column_name = 'total_price'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_order_lines' AND column_name = 'amount'
        ) THEN
          ALTER TABLE sales_order_lines RENAME COLUMN total_price TO amount;
        END IF;
      END$$;
    `);

    // ─── sales_order_lines: add missing columns ────────────────────────
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS quotation_line_id UUID,
        ADD COLUMN IF NOT EXISTS delivered_quantity INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS line_type VARCHAR(50) DEFAULT 'goods',
        ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT 'pending'
    `);

    // ─── sales_order_lines: make item_id nullable ──────────────────────
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN item_id DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert sales_order_lines
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN item_id SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        DROP COLUMN IF EXISTS fulfillment_status,
        DROP COLUMN IF EXISTS line_type,
        DROP COLUMN IF EXISTS tax_percent,
        DROP COLUMN IF EXISTS delivered_quantity,
        DROP COLUMN IF EXISTS quotation_line_id
    `);

    // Rename amount back to total_price
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_order_lines' AND column_name = 'amount'
        ) THEN
          ALTER TABLE sales_order_lines RENAME COLUMN amount TO total_price;
        END IF;
      END$$;
    `);

    // Revert sales_orders
    await queryRunner.query(`
      ALTER TABLE sales_orders
        DROP COLUMN IF EXISTS journal_entry_id,
        DROP COLUMN IF EXISTS gl_posting_queue_id,
        DROP COLUMN IF EXISTS payment_term_label,
        DROP COLUMN IF EXISTS payment_term_days,
        DROP COLUMN IF EXISTS grand_total,
        DROP COLUMN IF EXISTS tax_amount,
        DROP COLUMN IF EXISTS discount_amount,
        DROP COLUMN IF EXISTS quotation_id
    `);

    // Rename expected_delivery_date back
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'expected_delivery_date'
        ) THEN
          ALTER TABLE sales_orders RENAME COLUMN expected_delivery_date TO delivery_date;
        END IF;
      END$$;
    `);

    // Rename so_number back
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sales_orders' AND column_name = 'so_number'
        ) THEN
          ALTER TABLE sales_orders RENAME COLUMN so_number TO order_number;
        END IF;
      END$$;
    `);
  }
}
