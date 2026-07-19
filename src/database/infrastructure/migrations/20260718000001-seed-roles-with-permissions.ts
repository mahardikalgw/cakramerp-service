import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRolesWithPermissions20260718000001
  implements MigrationInterface
{
  name = 'SeedRolesWithPermissions20260718000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Create roles ───
    const roles = [
      {
        name: 'laboran',
        description: 'Laboratory technician who performs testing and enters results',
      },
      {
        name: 'staff',
        description: 'Staff member with access to lab operations',
      },
      {
        name: 'customer',
        description: 'Customer portal user',
      },
    ];

    for (const role of roles) {
      await queryRunner.query(
        `INSERT INTO roles (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = $2`,
        [role.name, role.description],
      );
    }

    // ─── 2. Define permissions per role ───
    const laboranPermissions = [
      // Schedules
      'schedules:read',
      'schedules:create',
      'schedules:update',
      'schedules:confirm',
      // Samples
      'samples:read',
      'samples:create',
      'samples:update',
      // Test results
      'test-results:read',
      'test-results:create',
      'test-results:update',
      'test-results:submit',
      // Testing services (read-only)
      'testing-services:read',
      // Testing requests (read-only)
      'testing-requests:read',
      // Daily reports
      'daily-reports:read',
      'daily-reports:create',
      'daily-reports:submit',
      // Sample types (read-only)
      'sample-types:read',
      // Laboratories (read-only)
      'laboratories:read',
      // Quota
      'quota:read',
      // Dashboard
      'dashboard:lab',
    ];

    const staffPermissions = [
      // Testing requests (full)
      'testing-requests:read',
      'testing-requests:create',
      'testing-requests:update',
      'testing-requests:delete',
      'testing-requests:approve',
      'testing-requests:assign',
      'testing-requests:submit',
      'testing-requests:cancel',
      'testing-requests:upload-document',
      'testing-requests:verify-documents',
      'testing-requests:generate-report',
      'testing-requests:grant-quota',
      // Schedules (full)
      'schedules:read',
      'schedules:create',
      'schedules:update',
      'schedules:delete',
      'schedules:confirm',
      // Test results (full)
      'test-results:read',
      'test-results:create',
      'test-results:update',
      'test-results:submit',
      'test-results:approve',
      'test-results:delete',
      // Samples (full)
      'samples:read',
      'samples:create',
      'samples:update',
      'samples:delete',
      // Testing services (full)
      'testing-services:read',
      'testing-services:create',
      'testing-services:update',
      'testing-services:delete',
      // Laboratories (full)
      'laboratories:read',
      'laboratories:create',
      'laboratories:update',
      'laboratories:delete',
      // Sample types (full)
      'sample-types:read',
      'sample-types:create',
      'sample-types:update',
      'sample-types:delete',
      // Daily reports (full)
      'daily-reports:read',
      'daily-reports:create',
      'daily-reports:submit',
      'daily-reports:approve',
      'daily-reports:delete',
      // Contracts (read)
      'contracts:read',
      // Lab purchase orders (read)
      'lab-purchase-orders:read',
      // Customers (read)
      'customers:read',
      // Certificates
      'certificates:read',
      'certificates:create',
      'certificates:approve',
      // Archives
      'archives:read',
      'archives:create',
      // Quota
      'quota:read',
      // Dashboard
      'dashboard:lab',
      'dashboard:read',
    ];

    const customerPermissions = [
      // Testing requests (read-only)
      'testing-requests:read',
      // Schedules (read-only)
      'schedules:read',
      // Test results (read-only)
      'test-results:read',
      // Contracts (read-only)
      'contracts:read',
      // Certificates
      'certificates:read',
      // Dashboard
      'dashboard:customer',
    ];

    // ─── 3. Assign permissions to roles ───
    const rolePermissionMap: Record<string, string[]> = {
      laboran: laboranPermissions,
      staff: staffPermissions,
      customer: customerPermissions,
    };

    for (const [roleName, permissions] of Object.entries(rolePermissionMap)) {
      for (const permName of permissions) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.name = $2
             AND NOT EXISTS (
               SELECT 1 FROM role_permissions rp
               WHERE rp.role_id = r.id AND rp.permission_id = p.id
             )`,
          [roleName, permName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE role_id IN (
         SELECT id FROM roles WHERE name IN ('laboran', 'staff', 'customer')
       )`,
    );
    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('laboran', 'staff', 'customer')`,
    );
  }
}
