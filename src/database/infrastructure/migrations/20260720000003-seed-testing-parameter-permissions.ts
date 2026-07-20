import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestingParameterPermissions20260720000003
  implements MigrationInterface
{
  name = 'SeedTestingParameterPermissions20260720000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      ['testing-parameters:read', 'testing-parameters', 'read'],
      ['testing-parameters:create', 'testing-parameters', 'create'],
      ['testing-parameters:update', 'testing-parameters', 'update'],
      ['testing-parameters:delete', 'testing-parameters', 'delete'],
    ];

    for (const [action, resource, operation] of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (action, resource, operation)
         VALUES ($1, $2, $3)
         ON CONFLICT (action) DO NOTHING`,
        [action, resource, operation],
      );
    }

    // Assign to admin and laboran roles
    const roles = ['admin', 'laboran'];
    for (const roleName of roles) {
      for (const [action] of permissions) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.action = $2
           ON CONFLICT DO NOTHING`,
          [roleName, action],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM permissions WHERE resource = 'testing-parameters'`,
    );
  }
}
