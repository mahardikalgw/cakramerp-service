import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix incomplete customer permissions for testing-request upload flow.
 *
 * `laboratory/testing-requests/:id/upload-payment-proof` and
 * `upload-signed` both require `testing-requests:upload-document`
 * (see testing-request.controller.ts). The earlier seeder
 * 20260718000001-seed-roles-with-permissions.ts stripped customer to
 * only `testing-requests:read`, so customers hitting the lab endpoint
 * (or any role check that reuses the permission) got 403 when trying
 * to upload payment proof. The portal controllers bypass PermissionsGuard
 * but the permission is still authoritative for role checks.
 *
 * This migration re-grants the missing testing-request permissions to
 * the customer role and ensures the permission row exists.
 */
export class FixCustomerTestingRequestUploadPermissions20260807000001
  implements MigrationInterface
{
  name = 'FixCustomerTestingRequestUploadPermissions20260807000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const missingPermissions: Array<[string, string, string]> = [
      ['testing-requests:create', 'testing-requests', 'create'],
      ['testing-requests:update', 'testing-requests', 'update'],
      ['testing-requests:submit', 'testing-requests', 'submit'],
      ['testing-requests:cancel', 'testing-requests', 'cancel'],
      ['testing-requests:upload-document', 'testing-requests', 'upload-document'],
    ];

    for (const [name, resource, action] of missingPermissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    const customerGrants = [
      'testing-requests:read',
      'testing-requests:create',
      'testing-requests:update',
      'testing-requests:submit',
      'testing-requests:cancel',
      'testing-requests:upload-document',
    ];

    for (const perm of customerGrants) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.name = 'customer' AND p.name = $1
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp
             WHERE rp.role_id = r.id AND rp.permission_id = p.id
           )`,
        [perm],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const perms = [
      'testing-requests:create',
      'testing-requests:update',
      'testing-requests:submit',
      'testing-requests:cancel',
      'testing-requests:upload-document',
    ];
    for (const perm of perms) {
      await queryRunner.query(
        `DELETE FROM role_permissions
         WHERE role_id IN (SELECT id FROM roles WHERE name = 'customer')
           AND permission_id IN (SELECT id FROM permissions WHERE name = $1)`,
        [perm],
      );
    }
    // keep permissions rows (may be used by staff/admin)
  }
}
