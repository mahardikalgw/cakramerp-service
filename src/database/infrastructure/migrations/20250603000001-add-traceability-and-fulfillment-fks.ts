import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add traceability table and FK columns so purchasing/sales can record
 * full document chains (PR → PO → GRN → AP → Payment, and QT → SO →
 * Issuance → AR → Payment).
 *
 * Also seeds the `trace:read` permission and grants it to roles that
 * already see cross-module financial data.
 */
export class AddTraceabilityAndFulfillmentFks20250603000001 implements MigrationInterface {
  name = 'AddTraceabilityAndFulfillmentFks20250603000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Document-links traceability table ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type VARCHAR(50) NOT NULL,
        source_id UUID NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id UUID NOT NULL,
        link_kind VARCHAR(50) DEFAULT 'orchestration',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT UQ_document_links UNIQUE (source_type, source_id, target_type, target_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_document_links_source ON document_links (source_type, source_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_document_links_target ON document_links (target_type, target_id)`,
    );

    // ─── FK columns on warehouse tables (idempotent) ─────────────────
    await queryRunner.query(
      `ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS po_id UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_goods_receipts_po ON goods_receipts (po_id)`,
    );

    await queryRunner.query(
      `ALTER TABLE stock_issuances ADD COLUMN IF NOT EXISTS so_id UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_stock_issuances_so ON stock_issuances (so_id)`,
    );

    // ─── FK columns on finance tables (idempotent) ───────────────────
    await queryRunner.query(
      `ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS purchase_order_id UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_ap_invoices_po ON ap_invoices (purchase_order_id)`,
    );
    await queryRunner.query(
      `ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS sales_order_id UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IX_ar_invoices_so ON ar_invoices (sales_order_id)`,
    );

    // Make sure purchasing_manager and sales_manager exist (inserting as
    // idempotent no-ops if not present) - must run BEFORE the permission grants
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'purchasing_manager', 'Manages purchasing documents (PR, PO, Returns)', now(), now()),
        (gen_random_uuid(), 'sales_manager', 'Manages sales documents (Quotation, SO, Returns)', now(), now())
      ON CONFLICT (name) DO NOTHING
    `);

    // ─── Permissions ────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "resource", "action", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'trace:read', 'trace', 'read', now(), now())
      ON CONFLICT (name) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE r.name IN ('admin', 'director', 'finance_manager', 'accountant', 'warehouse_manager', 'purchasing_manager', 'sales_manager')
        AND p.name = 'trace:read'
      ON CONFLICT DO NOTHING
    `);

    // Grant purchasing docs to purchasing_manager
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE r.name = 'purchasing_manager'
        AND p.name IN (
          'purchase-requests:read','purchase-requests:create','purchase-requests:update',
          'purchase-requests:approve','purchase-requests:delete',
          'purchase-orders:read','purchase-orders:create','purchase-orders:update',
          'purchase-orders:approve','purchase-orders:delete',
          'purchase-returns:read','purchase-returns:create','purchase-returns:update','purchase-returns:delete',
          'suppliers:read','suppliers:create','suppliers:update',
          'supplier-invoices:read',
          'goods-receipts:read',
          'trace:read'
        )
      ON CONFLICT DO NOTHING
    `);

    // Grant sales docs to sales_manager
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE r.name = 'sales_manager'
        AND p.name IN (
          'quotations:read','quotations:create','quotations:update','quotations:delete',
          'sales-orders:read','sales-orders:create','sales-orders:update',
          'sales-orders:approve','sales-orders:delete',
          'sales-returns:read','sales-returns:create','sales-returns:update','sales-returns:delete',
          'customers:read','customers:create','customers:update',
          'sales-invoices:read',
          'issuances:read',
          'trace:read'
        )
      ON CONFLICT DO NOTHING
    `);

    // Cross-read: warehouse_manager can see purchasing/sales document links
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE r.name = 'warehouse_manager'
        AND p.name IN (
          'purchase-orders:read','purchase-returns:read',
          'sales-orders:read','sales-returns:read',
          'trace:read'
        )
      ON CONFLICT DO NOTHING
    `);

    // Cross-read: site_manager
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r CROSS JOIN "permissions" p
      WHERE r.name = 'site_manager'
        AND p.name IN ('trace:read')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_document_links_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_document_links_source"`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_links`);

    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT id FROM "permissions" WHERE name = 'trace:read')`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE name = 'trace:read'`,
    );

    await queryRunner.query(
      `DELETE FROM "roles" WHERE name IN ('purchasing_manager', 'sales_manager')`,
    );
  }
}
