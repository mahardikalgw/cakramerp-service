import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseAndSalesOrders20250602000001 implements MigrationInterface {
  name = 'CreatePurchaseAndSalesOrders20250602000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number varchar(100) NOT NULL UNIQUE,
        supplier_id uuid NOT NULL,
        supplier_name varchar(255) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'draft',
        order_date timestamptz NOT NULL,
        expected_date timestamptz NULL,
        total_amount numeric NOT NULL DEFAULT 0,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id uuid NOT NULL,
        item_id uuid NOT NULL,
        item_name varchar(255) NOT NULL,
        quantity numeric NOT NULL,
        uom varchar(50) NOT NULL,
        unit_cost numeric NOT NULL DEFAULT 0,
        total_cost numeric NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_purchase_order_lines_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number varchar(100) NOT NULL UNIQUE,
        customer_id uuid NOT NULL,
        customer_name varchar(255) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'draft',
        order_date timestamptz NOT NULL,
        delivery_date timestamptz NULL,
        total_amount numeric NOT NULL DEFAULT 0,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_order_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sales_order_id uuid NOT NULL,
        item_id uuid NOT NULL,
        item_name varchar(255) NOT NULL,
        quantity numeric NOT NULL,
        uom varchar(50) NOT NULL,
        unit_price numeric NOT NULL DEFAULT 0,
        total_price numeric NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_sales_order_lines_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO permissions (id, name, resource, action, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'purchase-orders:read', 'purchase-orders', 'read', now(), now()),
        (gen_random_uuid(), 'purchase-orders:create', 'purchase-orders', 'create', now(), now()),
        (gen_random_uuid(), 'purchase-orders:update', 'purchase-orders', 'update', now(), now()),
        (gen_random_uuid(), 'sales-orders:read', 'sales-orders', 'read', now(), now()),
        (gen_random_uuid(), 'sales-orders:create', 'sales-orders', 'create', now(), now()),
        (gen_random_uuid(), 'sales-orders:update', 'sales-orders', 'update', now(), now())
      ON CONFLICT (name) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'director')
        AND p.name IN (
          'purchase-orders:read', 'purchase-orders:create', 'purchase-orders:update',
          'sales-orders:read', 'sales-orders:create', 'sales-orders:update'
        )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'purchase-orders:read', 'purchase-orders:create', 'purchase-orders:update',
          'sales-orders:read', 'sales-orders:create', 'sales-orders:update'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'purchase-orders:read', 'purchase-orders:create', 'purchase-orders:update',
        'sales-orders:read', 'sales-orders:create', 'sales-orders:update'
      )
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS sales_order_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_orders`);
  }
}
