import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCustomerCancelPermission20260608000004 implements MigrationInterface {
  name = 'SeedCustomerCancelPermission20260608000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (name, resource, action)
       VALUES ('testing-requests:cancel', 'testing-requests', 'cancel')
       ON CONFLICT (name) DO NOTHING`,
    );

    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'customer' AND p.name = 'testing-requests:cancel'
         AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
      `,
    );

    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'admin' AND p.name = 'testing-requests:cancel'
         AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions rp
       USING roles r, permissions p
       WHERE rp.role_id = r.id AND rp.permission_id = p.id
         AND r.name IN ('customer', 'admin') AND p.name = 'testing-requests:cancel'
      `,
    );

    await queryRunner.query(
      `DELETE FROM permissions WHERE name = 'testing-requests:cancel'`,
    );
  }
}
