import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed missing delete permissions for lab resources that were added after the
 * initial lab permissions seed (20250604000008) but never got delete actions:
 *   - archives:delete
 *   - certificates:delete
 *   - distributions:delete
 *
 * Also grants all three to the admin role.
 */
export class SeedMissingLabDeletePermissions20260706000005
  implements MigrationInterface
{
  name = 'SeedMissingLabDeletePermissions20260706000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions: [string, string, string][] = [
      ['archives:delete', 'archives', 'delete'],
      ['certificates:delete', 'certificates', 'delete'],
      ['distributions:delete', 'distributions', 'delete'],
    ];

    for (const [name, resource, action] of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'archives:delete',
          'certificates:delete',
          'distributions:delete'
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
        SELECT id FROM permissions
        WHERE name IN (
          'archives:delete',
          'certificates:delete',
          'distributions:delete'
        )
      )
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE name IN (
        'archives:delete',
        'certificates:delete',
        'distributions:delete'
      )
    `);
  }
}
