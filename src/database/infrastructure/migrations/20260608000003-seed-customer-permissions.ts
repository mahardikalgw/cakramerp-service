import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCustomerPermissions20260608000003 implements MigrationInterface {
  name = 'SeedCustomerPermissions20260608000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, description)
      VALUES ('customer', 'Customer portal user — submits and tracks lab test requests')
      ON CONFLICT (name) DO NOTHING
    `);

    const customerPermissions = [
      'dashboard:customer',
      'quota:read',
      'customers:read',
      'customers:update',
      'testing-requests:read',
      'testing-requests:create',
      'testing-requests:submit',
      'testing-services:read',
      'laboratories:read',
      'sample-types:read',
      'contracts:read',
      'lab-purchase-orders:read',
      'samples:read',
      'test-results:read',
      'daily-reports:read',
      'schedules:read',
      'verifications:read',
      'closings:read',
      'certificates:read',
      'payment-methods:read',
      'payment-evidences:read',
      'payment-evidences:create',
      'archives:read',
      'distributions:read',
    ];

    for (const permName of customerPermissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = 'customer' AND p.name = $1
           AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
        `,
        [permName],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const customerPermissions = [
      'dashboard:customer',
      'quota:read',
      'customers:read',
      'customers:update',
      'testing-requests:read',
      'testing-requests:create',
      'testing-requests:submit',
      'testing-services:read',
      'laboratories:read',
      'sample-types:read',
      'contracts:read',
      'lab-purchase-orders:read',
      'samples:read',
      'test-results:read',
      'daily-reports:read',
      'schedules:read',
      'verifications:read',
      'closings:read',
      'certificates:read',
      'payment-methods:read',
      'payment-evidences:read',
      'payment-evidences:create',
      'archives:read',
      'distributions:read',
    ];

    for (const permName of customerPermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions rp
         USING roles r, permissions p
         WHERE rp.role_id = r.id AND rp.permission_id = p.id
           AND r.name = 'customer' AND p.name = $1
        `,
        [permName],
      );
    }
  }
}
