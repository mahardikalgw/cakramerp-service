import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLabPermissions20250604000008 implements MigrationInterface {
  name = 'SeedLabPermissions20250604000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      // Testing Services
      ['testing-services:read', 'testing-services', 'read'],
      ['testing-services:create', 'testing-services', 'create'],
      ['testing-services:update', 'testing-services', 'update'],
      ['testing-services:delete', 'testing-services', 'delete'],
      // Laboratories
      ['laboratories:read', 'laboratories', 'read'],
      ['laboratories:create', 'laboratories', 'create'],
      ['laboratories:update', 'laboratories', 'update'],
      ['laboratories:delete', 'laboratories', 'delete'],
      // Sample Types
      ['sample-types:read', 'sample-types', 'read'],
      ['sample-types:create', 'sample-types', 'create'],
      ['sample-types:update', 'sample-types', 'update'],
      ['sample-types:delete', 'sample-types', 'delete'],
      // Testing Requests
      ['testing-requests:read', 'testing-requests', 'read'],
      ['testing-requests:create', 'testing-requests', 'create'],
      ['testing-requests:update', 'testing-requests', 'update'],
      ['testing-requests:submit', 'testing-requests', 'submit'],
      ['testing-requests:approve', 'testing-requests', 'approve'],
      ['testing-requests:delete', 'testing-requests', 'delete'],
      // Contracts
      ['contracts:read', 'contracts', 'read'],
      ['contracts:create', 'contracts', 'create'],
      ['contracts:update', 'contracts', 'update'],
      ['contracts:approve', 'contracts', 'approve'],
      ['contracts:delete', 'contracts', 'delete'],
      // Lab Purchase Orders
      ['lab-purchase-orders:read', 'lab-purchase-orders', 'read'],
      ['lab-purchase-orders:create', 'lab-purchase-orders', 'create'],
      ['lab-purchase-orders:update', 'lab-purchase-orders', 'update'],
      ['lab-purchase-orders:approve', 'lab-purchase-orders', 'approve'],
      ['lab-purchase-orders:delete', 'lab-purchase-orders', 'delete'],
      // Samples
      ['samples:read', 'samples', 'read'],
      ['samples:create', 'samples', 'create'],
      ['samples:update', 'samples', 'update'],
      ['samples:delete', 'samples', 'delete'],
      // Schedules
      ['schedules:read', 'schedules', 'read'],
      ['schedules:create', 'schedules', 'create'],
      ['schedules:update', 'schedules', 'update'],
      ['schedules:delete', 'schedules', 'delete'],
      // Test Results
      ['test-results:read', 'test-results', 'read'],
      ['test-results:create', 'test-results', 'create'],
      ['test-results:update', 'test-results', 'update'],
      ['test-results:submit', 'test-results', 'submit'],
      ['test-results:approve', 'test-results', 'approve'],
      ['test-results:delete', 'test-results', 'delete'],
      // Daily Reports
      ['daily-reports:read', 'daily-reports', 'read'],
      ['daily-reports:create', 'daily-reports', 'create'],
      ['daily-reports:submit', 'daily-reports', 'submit'],
      ['daily-reports:approve', 'daily-reports', 'approve'],
      ['daily-reports:delete', 'daily-reports', 'delete'],
    ];

    for (const [name, resource, action] of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant all lab permissions to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.resource IN (
          'testing-services', 'laboratories', 'sample-types',
          'testing-requests', 'contracts', 'lab-purchase-orders',
          'samples', 'schedules', 'test-results', 'daily-reports'
        )
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource IN (
          'testing-services', 'laboratories', 'sample-types',
          'testing-requests', 'contracts', 'lab-purchase-orders',
          'samples', 'schedules', 'test-results', 'daily-reports'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource IN (
        'testing-services', 'laboratories', 'sample-types',
        'testing-requests', 'contracts', 'lab-purchase-orders',
        'samples', 'schedules', 'test-results', 'daily-reports'
      );
    `);
  }
}
