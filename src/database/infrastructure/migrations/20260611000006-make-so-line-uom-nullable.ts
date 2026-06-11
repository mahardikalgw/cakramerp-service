import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSOLineUomNullable20260611000006 implements MigrationInterface {
  name = 'MakeSOLineUomNullable20260611000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make uom nullable on sales_order_lines (testing services don't have physical UOM)
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN uom DROP NOT NULL
    `);

    // Same for quotation_lines for consistency
    await queryRunner.query(`
      ALTER TABLE quotation_lines
        ALTER COLUMN uom DROP NOT NULL
    `);

    // Same for sales_return_lines
    await queryRunner.query(`
      ALTER TABLE sales_return_lines
        ALTER COLUMN uom DROP NOT NULL
    `);

    // Make purchase_order_lines.uom nullable too for consistency
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ALTER COLUMN uom DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set default value for any null rows before re-applying NOT NULL
    await queryRunner.query(`
      UPDATE sales_order_lines SET uom = 'pcs' WHERE uom IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sales_order_lines
        ALTER COLUMN uom SET NOT NULL
    `);

    await queryRunner.query(`
      UPDATE quotation_lines SET uom = 'pcs' WHERE uom IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE quotation_lines
        ALTER COLUMN uom SET NOT NULL
    `);

    await queryRunner.query(`
      UPDATE sales_return_lines SET uom = 'pcs' WHERE uom IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sales_return_lines
        ALTER COLUMN uom SET NOT NULL
    `);

    await queryRunner.query(`
      UPDATE purchase_order_lines SET uom = 'pcs' WHERE uom IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ALTER COLUMN uom SET NOT NULL
    `);
  }
}
