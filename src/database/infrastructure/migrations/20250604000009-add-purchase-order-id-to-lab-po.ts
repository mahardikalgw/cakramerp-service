import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderIdToLabPO20250604000009 implements MigrationInterface {
  name = 'AddPurchaseOrderIdToLabPO20250604000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_purchase_orders
        ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lab_po_purchase_order
        ON lab_purchase_orders(purchase_order_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_lab_po_purchase_order;
    `);
    await queryRunner.query(`
      ALTER TABLE lab_purchase_orders
        DROP COLUMN IF EXISTS purchase_order_id;
    `);
  }
}
