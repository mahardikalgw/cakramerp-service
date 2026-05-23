import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWarehouseModule20250522000004 implements MigrationInterface {
  name = 'CreateWarehouseModule20250522000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== Items ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        uom VARCHAR(50) NOT NULL,
        min_stock_level NUMERIC(18,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Warehouses ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'main',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Stock Ledger ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES items(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        movement_type VARCHAR(50) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        balance_after NUMERIC(18,4) NOT NULL,
        reference_type VARCHAR(100),
        reference_id UUID,
        description VARCHAR(500),
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Item Stock Balances (materialized) ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS item_stock_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES items(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
        last_movement_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, warehouse_id)
      );
    `)

    // ==================== Goods Receipts ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grn_number VARCHAR(100) NOT NULL UNIQUE,
        po_id UUID,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        vendor_name VARCHAR(255) NOT NULL,
        received_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
        notes TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Goods Receipt Lines ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goods_receipt_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES items(id),
        item_name VARCHAR(255) NOT NULL,
        po_qty NUMERIC(18,4) NOT NULL,
        received_qty NUMERIC(18,4) NOT NULL,
        discrepancy_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
        uom VARCHAR(50) NOT NULL,
        remarks VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Stock Issuances ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_issuances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        issuance_number VARCHAR(100) NOT NULL UNIQUE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        destination_type VARCHAR(50) NOT NULL,
        destination_id UUID NOT NULL,
        destination_name VARCHAR(255) NOT NULL,
        issuance_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
        reversal_reason VARCHAR(500),
        reversed_at TIMESTAMP,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Stock Issuance Lines ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_issuance_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        issuance_id UUID NOT NULL REFERENCES stock_issuances(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES items(id),
        item_name VARCHAR(255) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        uom VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Stock Opname Sessions ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_opname_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        warehouse_name VARCHAR(255) NOT NULL,
        conducted_by UUID NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMP,
        approved_by UUID,
        approved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Stock Opname Lines ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_opname_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES stock_opname_sessions(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES items(id),
        item_name VARCHAR(255) NOT NULL,
        system_qty NUMERIC(18,4) NOT NULL,
        actual_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
        variance_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
        uom VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Equipment Units ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(100) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        site_id UUID,
        site_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        current_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Maintenance Schedules ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES equipment_units(id) ON DELETE CASCADE,
        interval_type VARCHAR(50) NOT NULL,
        interval_value INTEGER NOT NULL,
        last_done_date DATE,
        last_done_hours NUMERIC(10,2),
        next_due_date DATE,
        next_due_hours NUMERIC(10,2),
        description VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Maintenance Logs ====================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id UUID NOT NULL REFERENCES equipment_units(id) ON DELETE CASCADE,
        maintenance_date DATE NOT NULL,
        hours_at_maintenance NUMERIC(10,2) NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        cost NUMERIC(18,2) NOT NULL DEFAULT 0,
        performed_by VARCHAR(255) NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // ==================== Indexes ====================

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
      CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse ON stock_ledger(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_warehouse ON stock_ledger(item_id, warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger(created_at);
      CREATE INDEX IF NOT EXISTS idx_item_stock_balances_item ON item_stock_balances(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_stock_balances_warehouse ON item_stock_balances(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse ON goods_receipts(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_receipt ON goods_receipt_lines(goods_receipt_id);
      CREATE INDEX IF NOT EXISTS idx_stock_issuances_warehouse ON stock_issuances(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_issuance_lines_issuance ON stock_issuance_lines(issuance_id);
      CREATE INDEX IF NOT EXISTS idx_stock_opname_sessions_warehouse ON stock_opname_sessions(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_opname_lines_session ON stock_opname_lines(session_id);
      CREATE INDEX IF NOT EXISTS idx_equipment_units_type ON equipment_units(type);
      CREATE INDEX IF NOT EXISTS idx_equipment_units_status ON equipment_units(status);
      CREATE INDEX IF NOT EXISTS idx_equipment_units_site ON equipment_units(site_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_equipment ON maintenance_schedules(equipment_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_date);
      CREATE INDEX IF NOT EXISTS idx_maintenance_logs_equipment ON maintenance_logs(equipment_id);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_maintenance_logs_equipment;
      DROP INDEX IF EXISTS idx_maintenance_schedules_next_due;
      DROP INDEX IF EXISTS idx_maintenance_schedules_equipment;
      DROP INDEX IF EXISTS idx_equipment_units_site;
      DROP INDEX IF EXISTS idx_equipment_units_status;
      DROP INDEX IF EXISTS idx_equipment_units_type;
      DROP INDEX IF EXISTS idx_stock_opname_lines_session;
      DROP INDEX IF EXISTS idx_stock_opname_sessions_warehouse;
      DROP INDEX IF EXISTS idx_stock_issuance_lines_issuance;
      DROP INDEX IF EXISTS idx_stock_issuances_warehouse;
      DROP INDEX IF EXISTS idx_goods_receipt_lines_receipt;
      DROP INDEX IF EXISTS idx_goods_receipts_warehouse;
      DROP INDEX IF EXISTS idx_item_stock_balances_warehouse;
      DROP INDEX IF EXISTS idx_item_stock_balances_item;
      DROP INDEX IF EXISTS idx_stock_ledger_date;
      DROP INDEX IF EXISTS idx_stock_ledger_item_warehouse;
      DROP INDEX IF EXISTS idx_stock_ledger_warehouse;
      DROP INDEX IF EXISTS idx_stock_ledger_item;
      DROP INDEX IF EXISTS idx_items_is_active;
      DROP INDEX IF EXISTS idx_items_category;
      DROP INDEX IF EXISTS idx_items_code;

      DROP TABLE IF EXISTS maintenance_logs;
      DROP TABLE IF EXISTS maintenance_schedules;
      DROP TABLE IF EXISTS equipment_units;
      DROP TABLE IF EXISTS stock_opname_lines;
      DROP TABLE IF EXISTS stock_opname_sessions;
      DROP TABLE IF EXISTS stock_issuance_lines;
      DROP TABLE IF EXISTS stock_issuances;
      DROP TABLE IF EXISTS goods_receipt_lines;
      DROP TABLE IF EXISTS goods_receipts;
      DROP TABLE IF EXISTS item_stock_balances;
      DROP TABLE IF EXISTS stock_ledger;
      DROP TABLE IF EXISTS warehouses;
      DROP TABLE IF EXISTS items;
    `)
  }
}
