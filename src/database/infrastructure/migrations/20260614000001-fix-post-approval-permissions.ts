import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPostApprovalPermissions20260614000001 implements MigrationInterface {
  name = 'FixPostApprovalPermissions20260614000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert new permissions
    const newPermissions = [
      ['archives:read', 'archives', 'read'],
      ['archives:create', 'archives', 'create'],
      ['schedules:confirm', 'schedules', 'confirm'],
    ];

    for (const [name, resource, action] of newPermissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant new permissions to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.name IN ('archives:read', 'archives:create', 'schedules:confirm')
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);

    // Grant archives:read to laboran role (so they can view archive pages)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'laboran'
        AND p.name = 'archives:read'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove grants
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'archives:read', 'archives:create', 'schedules:confirm'
        )
      )
    `);

    // Remove permissions
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'archives:read', 'archives:create', 'schedules:confirm'
      )
    `);
  }
}