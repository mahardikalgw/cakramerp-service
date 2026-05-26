import { MigrationInterface, QueryRunner } from 'typeorm'

export class MigrateToEntityLevelPermissions1748185200000
  implements MigrationInterface
{
  name = 'MigrateToEntityLevelPermissions1748185200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: Insert all new entity-level permissions ───────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "resource", "action", "created_at", "updated_at")
      VALUES
        -- Finance: Chart of Accounts
        (gen_random_uuid(), 'chart-of-accounts:read', 'chart-of-accounts', 'read', now(), now()),
        (gen_random_uuid(), 'chart-of-accounts:create', 'chart-of-accounts', 'create', now(), now()),
        (gen_random_uuid(), 'chart-of-accounts:update', 'chart-of-accounts', 'update', now(), now()),
        (gen_random_uuid(), 'chart-of-accounts:delete', 'chart-of-accounts', 'delete', now(), now()),
        -- Finance: Journal Entries
        (gen_random_uuid(), 'journal-entries:read', 'journal-entries', 'read', now(), now()),
        (gen_random_uuid(), 'journal-entries:create', 'journal-entries', 'create', now(), now()),
        (gen_random_uuid(), 'journal-entries:update', 'journal-entries', 'update', now(), now()),
        (gen_random_uuid(), 'journal-entries:approve', 'journal-entries', 'approve', now(), now()),
        -- Finance: Sales Invoices
        (gen_random_uuid(), 'sales-invoices:read', 'sales-invoices', 'read', now(), now()),
        (gen_random_uuid(), 'sales-invoices:create', 'sales-invoices', 'create', now(), now()),
        (gen_random_uuid(), 'sales-invoices:update', 'sales-invoices', 'update', now(), now()),
        -- Finance: Supplier Invoices
        (gen_random_uuid(), 'supplier-invoices:read', 'supplier-invoices', 'read', now(), now()),
        (gen_random_uuid(), 'supplier-invoices:create', 'supplier-invoices', 'create', now(), now()),
        (gen_random_uuid(), 'supplier-invoices:update', 'supplier-invoices', 'update', now(), now()),
        -- Finance: Bank Reconciliation
        (gen_random_uuid(), 'bank-reconciliation:read', 'bank-reconciliation', 'read', now(), now()),
        (gen_random_uuid(), 'bank-reconciliation:create', 'bank-reconciliation', 'create', now(), now()),
        (gen_random_uuid(), 'bank-reconciliation:update', 'bank-reconciliation', 'update', now(), now()),
        -- Finance: Financial Statements
        (gen_random_uuid(), 'financial-statements:read', 'financial-statements', 'read', now(), now()),
        -- Warehouse: Stock Items
        (gen_random_uuid(), 'stock-items:read', 'stock-items', 'read', now(), now()),
        (gen_random_uuid(), 'stock-items:create', 'stock-items', 'create', now(), now()),
        (gen_random_uuid(), 'stock-items:update', 'stock-items', 'update', now(), now()),
        (gen_random_uuid(), 'stock-items:delete', 'stock-items', 'delete', now(), now()),
        -- Warehouse: Stock (levels)
        (gen_random_uuid(), 'stock:read', 'stock', 'read', now(), now()),
        -- Warehouse: Goods Receipts
        (gen_random_uuid(), 'goods-receipts:read', 'goods-receipts', 'read', now(), now()),
        (gen_random_uuid(), 'goods-receipts:create', 'goods-receipts', 'create', now(), now()),
        -- Warehouse: Issuances
        (gen_random_uuid(), 'issuances:read', 'issuances', 'read', now(), now()),
        (gen_random_uuid(), 'issuances:create', 'issuances', 'create', now(), now()),
        (gen_random_uuid(), 'issuances:update', 'issuances', 'update', now(), now()),
        -- Warehouse: Stock Opname
        (gen_random_uuid(), 'stock-opname:read', 'stock-opname', 'read', now(), now()),
        (gen_random_uuid(), 'stock-opname:create', 'stock-opname', 'create', now(), now()),
        (gen_random_uuid(), 'stock-opname:update', 'stock-opname', 'update', now(), now()),
        (gen_random_uuid(), 'stock-opname:approve', 'stock-opname', 'approve', now(), now()),
        -- HR: THR
        (gen_random_uuid(), 'thr:read', 'thr', 'read', now(), now()),
        (gen_random_uuid(), 'thr:create', 'thr', 'create', now(), now()),
        (gen_random_uuid(), 'thr:update', 'thr', 'update', now(), now()),
        -- HR: BPJS Report
        (gen_random_uuid(), 'bpjs-report:read', 'bpjs-report', 'read', now(), now()),
        -- Admin: Audit Logs (rename from audit:read)
        (gen_random_uuid(), 'audit-logs:read', 'audit-logs', 'read', now(), now()),
        -- Admin: Settings update (separate from read)
        (gen_random_uuid(), 'settings:update', 'settings', 'update', now(), now()),
        -- Admin: Backups create (separate from read)
        (gen_random_uuid(), 'backups:create', 'backups', 'create', now(), now())
      ON CONFLICT (name) DO NOTHING
    `)

    // ─── Step 2: Assign entity-level permissions to roles ──────────────

    // Admin & Director: get ALL new entity-level permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('admin', 'director')
        AND p.name IN (
          'chart-of-accounts:read', 'chart-of-accounts:create', 'chart-of-accounts:update', 'chart-of-accounts:delete',
          'journal-entries:read', 'journal-entries:create', 'journal-entries:update', 'journal-entries:approve',
          'sales-invoices:read', 'sales-invoices:create', 'sales-invoices:update',
          'supplier-invoices:read', 'supplier-invoices:create', 'supplier-invoices:update',
          'bank-reconciliation:read', 'bank-reconciliation:create', 'bank-reconciliation:update',
          'financial-statements:read',
          'stock-items:read', 'stock-items:create', 'stock-items:update', 'stock-items:delete',
          'stock:read',
          'goods-receipts:read', 'goods-receipts:create',
          'issuances:read', 'issuances:create', 'issuances:update',
          'stock-opname:read', 'stock-opname:create', 'stock-opname:update', 'stock-opname:approve',
          'thr:read', 'thr:create', 'thr:update',
          'bpjs-report:read',
          'audit-logs:read',
          'settings:update',
          'backups:create'
        )
      ON CONFLICT DO NOTHING
    `)

    // Finance Manager: all finance entity permissions + approve
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'finance_manager'
        AND p.name IN (
          'chart-of-accounts:read', 'chart-of-accounts:create', 'chart-of-accounts:update', 'chart-of-accounts:delete',
          'journal-entries:read', 'journal-entries:create', 'journal-entries:update', 'journal-entries:approve',
          'sales-invoices:read', 'sales-invoices:create', 'sales-invoices:update',
          'supplier-invoices:read', 'supplier-invoices:create', 'supplier-invoices:update',
          'bank-reconciliation:read', 'bank-reconciliation:create', 'bank-reconciliation:update',
          'financial-statements:read'
        )
      ON CONFLICT DO NOTHING
    `)

    // Accountant: finance entity read/create/update (no approve, no delete)
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'accountant'
        AND p.name IN (
          'chart-of-accounts:read', 'chart-of-accounts:create', 'chart-of-accounts:update',
          'journal-entries:read', 'journal-entries:create', 'journal-entries:update',
          'sales-invoices:read', 'sales-invoices:create', 'sales-invoices:update',
          'supplier-invoices:read', 'supplier-invoices:create', 'supplier-invoices:update',
          'bank-reconciliation:read', 'bank-reconciliation:create', 'bank-reconciliation:update',
          'financial-statements:read'
        )
      ON CONFLICT DO NOTHING
    `)

    // HR Manager: THR/BPJS permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'hr_manager'
        AND p.name IN (
          'thr:read', 'thr:create', 'thr:update',
          'bpjs-report:read'
        )
      ON CONFLICT DO NOTHING
    `)

    // Warehouse Manager: all warehouse entity permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'warehouse_manager'
        AND p.name IN (
          'stock-items:read', 'stock-items:create', 'stock-items:update', 'stock-items:delete',
          'stock:read',
          'goods-receipts:read', 'goods-receipts:create',
          'issuances:read', 'issuances:create', 'issuances:update',
          'stock-opname:read', 'stock-opname:create', 'stock-opname:update', 'stock-opname:approve'
        )
      ON CONFLICT DO NOTHING
    `)

    // Site Manager: read-only for warehouse and HR entities
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'site_manager'
        AND p.name IN (
          'stock-items:read', 'stock:read', 'goods-receipts:read', 'issuances:read', 'stock-opname:read',
          'thr:read', 'bpjs-report:read'
        )
      ON CONFLICT DO NOTHING
    `)

    // HR Staff: THR/BPJS read
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'hr_staff'
        AND p.name IN (
          'thr:read', 'bpjs-report:read'
        )
      ON CONFLICT DO NOTHING
    `)

    // ─── Step 3: Remove old module-level permissions ───────────────────
    // Remove role_permissions referencing old module-level permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE name IN (
          'finance:read', 'finance:write', 'finance:delete', 'finance:create', 'finance:update', 'finance:approve',
          'invoices:read', 'invoices:write', 'invoices:delete', 'invoices:create', 'invoices:update',
          'hr:read', 'hr:write', 'hr:delete',
          'inventory:read', 'inventory:write', 'inventory:create', 'inventory:update',
          'warehouse:read', 'warehouse:write', 'warehouse:delete', 'warehouse:create', 'warehouse:update',
          'audit:read', 'audit:write',
          'settings:write',
          'backups:write',
          'permissions:write', 'permissions:delete',
          'roles:write',
          'users:write'
        )
      )
    `)

    // Delete old module-level permissions
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE name IN (
        'finance:read', 'finance:write', 'finance:delete', 'finance:create', 'finance:update', 'finance:approve',
        'invoices:read', 'invoices:write', 'invoices:delete', 'invoices:create', 'invoices:update',
        'hr:read', 'hr:write', 'hr:delete',
        'inventory:read', 'inventory:write', 'inventory:create', 'inventory:update',
        'warehouse:read', 'warehouse:write', 'warehouse:delete', 'warehouse:create', 'warehouse:update',
        'audit:read', 'audit:write',
        'settings:write',
        'backups:write',
        'permissions:write', 'permissions:delete',
        'roles:write',
        'users:write'
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new entity-level permissions from role_permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions" WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE name IN (
          'chart-of-accounts:read', 'chart-of-accounts:create', 'chart-of-accounts:update', 'chart-of-accounts:delete',
          'journal-entries:read', 'journal-entries:create', 'journal-entries:update', 'journal-entries:approve',
          'sales-invoices:read', 'sales-invoices:create', 'sales-invoices:update',
          'supplier-invoices:read', 'supplier-invoices:create', 'supplier-invoices:update',
          'bank-reconciliation:read', 'bank-reconciliation:create', 'bank-reconciliation:update',
          'financial-statements:read',
          'stock-items:read', 'stock-items:create', 'stock-items:update', 'stock-items:delete',
          'stock:read',
          'goods-receipts:read', 'goods-receipts:create',
          'issuances:read', 'issuances:create', 'issuances:update',
          'stock-opname:read', 'stock-opname:create', 'stock-opname:update', 'stock-opname:approve',
          'thr:read', 'thr:create', 'thr:update',
          'bpjs-report:read',
          'audit-logs:read',
          'settings:update',
          'backups:create'
        )
      )
    `)

    // Delete new entity-level permissions
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE name IN (
        'chart-of-accounts:read', 'chart-of-accounts:create', 'chart-of-accounts:update', 'chart-of-accounts:delete',
        'journal-entries:read', 'journal-entries:create', 'journal-entries:update', 'journal-entries:approve',
        'sales-invoices:read', 'sales-invoices:create', 'sales-invoices:update',
        'supplier-invoices:read', 'supplier-invoices:create', 'supplier-invoices:update',
        'bank-reconciliation:read', 'bank-reconciliation:create', 'bank-reconciliation:update',
        'financial-statements:read',
        'stock-items:read', 'stock-items:create', 'stock-items:update', 'stock-items:delete',
        'stock:read',
        'goods-receipts:read', 'goods-receipts:create',
        'issuances:read', 'issuances:create', 'issuances:update',
        'stock-opname:read', 'stock-opname:create', 'stock-opname:update', 'stock-opname:approve',
        'thr:read', 'thr:create', 'thr:update',
        'bpjs-report:read',
        'audit-logs:read',
        'settings:update',
        'backups:create'
      )
    `)

    // Re-insert old module-level permissions (would need full re-seed to restore role mappings)
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "name", "resource", "action", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'finance:read', 'finance', 'read', now(), now()),
        (gen_random_uuid(), 'finance:write', 'finance', 'write', now(), now()),
        (gen_random_uuid(), 'finance:delete', 'finance', 'delete', now(), now()),
        (gen_random_uuid(), 'finance:create', 'finance', 'create', now(), now()),
        (gen_random_uuid(), 'finance:update', 'finance', 'update', now(), now()),
        (gen_random_uuid(), 'finance:approve', 'finance', 'approve', now(), now()),
        (gen_random_uuid(), 'invoices:read', 'invoices', 'read', now(), now()),
        (gen_random_uuid(), 'invoices:write', 'invoices', 'write', now(), now()),
        (gen_random_uuid(), 'invoices:delete', 'invoices', 'delete', now(), now()),
        (gen_random_uuid(), 'invoices:create', 'invoices', 'create', now(), now()),
        (gen_random_uuid(), 'invoices:update', 'invoices', 'update', now(), now()),
        (gen_random_uuid(), 'hr:read', 'hr', 'read', now(), now()),
        (gen_random_uuid(), 'hr:write', 'hr', 'write', now(), now()),
        (gen_random_uuid(), 'hr:delete', 'hr', 'delete', now(), now()),
        (gen_random_uuid(), 'inventory:read', 'inventory', 'read', now(), now()),
        (gen_random_uuid(), 'inventory:write', 'inventory', 'write', now(), now()),
        (gen_random_uuid(), 'inventory:create', 'inventory', 'create', now(), now()),
        (gen_random_uuid(), 'inventory:update', 'inventory', 'update', now(), now()),
        (gen_random_uuid(), 'warehouse:read', 'warehouse', 'read', now(), now()),
        (gen_random_uuid(), 'warehouse:write', 'warehouse', 'write', now(), now()),
        (gen_random_uuid(), 'warehouse:delete', 'warehouse', 'delete', now(), now()),
        (gen_random_uuid(), 'warehouse:create', 'warehouse', 'create', now(), now()),
        (gen_random_uuid(), 'warehouse:update', 'warehouse', 'update', now(), now()),
        (gen_random_uuid(), 'audit:read', 'audit', 'read', now(), now()),
        (gen_random_uuid(), 'audit:write', 'audit', 'write', now(), now()),
        (gen_random_uuid(), 'settings:write', 'settings', 'write', now(), now()),
        (gen_random_uuid(), 'backups:write', 'backups', 'write', now(), now()),
        (gen_random_uuid(), 'permissions:write', 'permissions', 'write', now(), now()),
        (gen_random_uuid(), 'permissions:delete', 'permissions', 'delete', now(), now()),
        (gen_random_uuid(), 'roles:write', 'roles', 'write', now(), now()),
        (gen_random_uuid(), 'users:write', 'users', 'write', now(), now())
      ON CONFLICT (name) DO NOTHING
    `)
  }
}
