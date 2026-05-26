import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddApprovalPermissions20250525000001 implements MigrationInterface {
  name = 'AddApprovalPermissions20250525000001'

  async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      { name: 'finance:approve', resource: 'finance', action: 'approve' },
      { name: 'finance:update', resource: 'finance', action: 'update' },
      { name: 'finance:create', resource: 'finance', action: 'create' },
      { name: 'invoices:create', resource: 'invoices', action: 'create' },
      { name: 'invoices:update', resource: 'invoices', action: 'update' },
      { name: 'employees:create', resource: 'employees', action: 'create' },
      { name: 'employees:update', resource: 'employees', action: 'update' },
      { name: 'attendance:create', resource: 'attendance', action: 'create' },
      { name: 'inventory:create', resource: 'inventory', action: 'create' },
      { name: 'inventory:update', resource: 'inventory', action: 'update' },
      { name: 'equipment:create', resource: 'equipment', action: 'create' },
      { name: 'equipment:update', resource: 'equipment', action: 'update' },
      { name: 'payroll:create', resource: 'payroll', action: 'create' },
      { name: 'payroll:update', resource: 'payroll', action: 'update' },
      { name: 'payroll:approve', resource: 'payroll', action: 'approve' },
      { name: 'warehouse:update', resource: 'warehouse', action: 'update' },
      { name: 'warehouse:create', resource: 'warehouse', action: 'create' },
      { name: 'users:create', resource: 'users', action: 'create' },
      { name: 'users:update', resource: 'users', action: 'update' },
      { name: 'roles:create', resource: 'roles', action: 'create' },
      { name: 'roles:update', resource: 'roles', action: 'update' },
    ]

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, name, resource, action, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, now(), now())
         ON CONFLICT (name) DO NOTHING`,
        [p.name, p.resource, p.action],
      )
    }

    // Give admin role all new permissions
    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'admin' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [p.name],
      )
    }

    // Give director all new permissions
    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'director' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [p.name],
      )
    }

    // finance:approve -> finance_manager
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'finance_manager' AND p.name = 'finance:approve'
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
    )

    // finance CRUD permissions -> finance_manager
    for (const perm of ['finance:create', 'finance:update', 'invoices:create', 'invoices:update']) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'finance_manager' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [perm],
      )
    }

    // finance create/update -> accountant (but NOT approve)
    for (const perm of ['finance:create', 'finance:update', 'invoices:create', 'invoices:update']) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'accountant' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [perm],
      )
    }

    // HR permissions -> hr_manager
    for (const perm of ['employees:create', 'employees:update', 'attendance:create', 'payroll:create', 'payroll:update', 'payroll:approve']) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'hr_manager' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [perm],
      )
    }

    // Warehouse permissions -> warehouse_manager
    for (const perm of ['warehouse:create', 'warehouse:update', 'inventory:create', 'inventory:update', 'equipment:create', 'equipment:update']) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'warehouse_manager' AND p.name = $1
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [perm],
      )
    }

    // User/role permissions -> admin (already done above with the loop)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const permNames = [
      'finance:approve', 'finance:update', 'finance:create',
      'invoices:create', 'invoices:update',
      'employees:create', 'employees:update',
      'attendance:create',
      'inventory:create', 'inventory:update',
      'equipment:create', 'equipment:update',
      'payroll:create', 'payroll:update', 'payroll:approve',
      'warehouse:update', 'warehouse:create',
      'users:create', 'users:update',
      'roles:create', 'roles:update',
    ]

    await queryRunner.query(
      `DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = ANY($1)
      )`,
      [permNames],
    )

    await queryRunner.query(
      `DELETE FROM permissions WHERE name = ANY($1)`,
      [permNames],
    )
  }
}
