import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabPurchaseOrders20250604000005 implements MigrationInterface {
  name = 'CreateLabPurchaseOrders20250604000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── LAB PURCHASE ORDERS ─────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        total_amount NUMERIC(18,2),
        sample_quantity INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_by VARCHAR(255),
        signed_by VARCHAR(255),
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_purchase_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lab_purchase_order_id UUID NOT NULL REFERENCES lab_purchase_orders(id) ON DELETE CASCADE,
        testing_service_id UUID NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        quantity INTEGER,
        unit_price NUMERIC(18,2),
        total NUMERIC(18,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lab_po_status ON lab_purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_lab_po_customer ON lab_purchase_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_lab_po_lines_po ON lab_purchase_order_lines(lab_purchase_order_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lab_purchase_order_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS lab_purchase_orders;`);
  }
}
