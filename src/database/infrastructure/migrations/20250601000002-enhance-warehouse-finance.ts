import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceWarehouseFinance20250601000002 implements MigrationInterface {
  name = 'EnhanceWarehouseFinance20250601000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unit_cost to goods receipt lines
    await queryRunner.query(`
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0;
      ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18,2) DEFAULT 0;
    `);

    // Add unit_cost to stock ledger (movement cost tracking)
    await queryRunner.query(`
      ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0;
      ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18,2) DEFAULT 0;
    `);

    // Add unit_cost to item_stock_balances (weighted average cost)
    await queryRunner.query(`
      ALTER TABLE item_stock_balances ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0;
      ALTER TABLE item_stock_balances ADD COLUMN IF NOT EXISTS total_value NUMERIC(18,2) DEFAULT 0;
    `);

    // Add unit_cost to stock issuance lines
    await queryRunner.query(`
      ALTER TABLE stock_issuance_lines ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0;
      ALTER TABLE stock_issuance_lines ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18,2) DEFAULT 0;
    `);

    // Add cost_per_unit to items for default cost
    await queryRunner.query(`
      ALTER TABLE items ADD COLUMN IF NOT EXISTS default_cost NUMERIC(18,2) DEFAULT 0;
    `);

    // Add gl_posting_queue_id and journal_entry_id to warehouse tables for GL tracking
    await queryRunner.query(`
      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gl_posting_queue_id UUID;
      ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS journal_entry_id UUID;
      ALTER TABLE stock_issuances ADD COLUMN IF NOT EXISTS gl_posting_queue_id UUID;
      ALTER TABLE stock_issuances ADD COLUMN IF NOT EXISTS journal_entry_id UUID;
      ALTER TABLE stock_opname_sessions ADD COLUMN IF NOT EXISTS gl_posting_queue_id UUID;
      ALTER TABLE stock_opname_sessions ADD COLUMN IF NOT EXISTS journal_entry_id UUID;
    `);

    // Seed inventory-related chart of accounts
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES
        ('1300', 'Persediaan Barang', 'asset', true),
        ('1310', 'GRNI (Barang Diterima Belum Ditagih)', 'asset', true),
        ('5100', 'Harga Pokok Penjualan (COGS)', 'expense', true),
        ('5200', 'Biaya Penyesuaian Persediaan', 'expense', true),
        ('5300', 'Biaya Pemeliharaan Peralatan', 'expense', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // Add warehouse source types to GL posting queue
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS warehouse_id UUID;
    `);

    // Permissions for warehouse master
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('warehouses:read', 'warehouses', 'read'),
        ('warehouses:create', 'warehouses', 'create'),
        ('warehouses:update', 'warehouses', 'update'),
        ('warehouses:delete', 'warehouses', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'warehouse_manager')
        AND p.name IN ('warehouses:read', 'warehouses:create', 'warehouses:update', 'warehouses:delete')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS warehouse_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_opname_sessions DROP COLUMN IF EXISTS journal_entry_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_opname_sessions DROP COLUMN IF EXISTS gl_posting_queue_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_issuances DROP COLUMN IF EXISTS journal_entry_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_issuances DROP COLUMN IF EXISTS gl_posting_queue_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipts DROP COLUMN IF EXISTS journal_entry_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipts DROP COLUMN IF EXISTS gl_posting_queue_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE items DROP COLUMN IF EXISTS default_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_issuance_lines DROP COLUMN IF EXISTS total_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_issuance_lines DROP COLUMN IF EXISTS unit_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE item_stock_balances DROP COLUMN IF EXISTS total_value;`,
    );
    await queryRunner.query(
      `ALTER TABLE item_stock_balances DROP COLUMN IF EXISTS unit_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_ledger DROP COLUMN IF EXISTS total_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_ledger DROP COLUMN IF EXISTS unit_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipt_lines DROP COLUMN IF EXISTS total_cost;`,
    );
    await queryRunner.query(
      `ALTER TABLE goods_receipt_lines DROP COLUMN IF EXISTS unit_cost;`,
    );
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('warehouses:read', 'warehouses:create', 'warehouses:update', 'warehouses:delete')
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('warehouses:read', 'warehouses:create', 'warehouses:update', 'warehouses:delete');
    `);
    await queryRunner.query(
      `DELETE FROM accounts WHERE code IN ('1300', '1310', '5100', '5200', '5300');`,
    );
  }
}
