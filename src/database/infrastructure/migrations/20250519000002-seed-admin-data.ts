import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAdminData20250519000002 implements MigrationInterface {
  name = 'SeedAdminData20250519000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // --- Permissions ---
    const permissions = [
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'users:read', resource: 'users', action: 'read' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', name: 'users:write', resource: 'users', action: 'write' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', name: 'users:delete', resource: 'users', action: 'delete' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893', name: 'roles:read', resource: 'roles', action: 'read' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567894', name: 'roles:write', resource: 'roles', action: 'write' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567895', name: 'roles:delete', resource: 'roles', action: 'delete' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567896', name: 'permissions:read', resource: 'permissions', action: 'read' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567897', name: 'permissions:write', resource: 'permissions', action: 'write' },
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567898', name: 'permissions:delete', resource: 'permissions', action: 'delete' },
    ];

    for (const p of permissions) {
      await queryRunner.query(`
        INSERT INTO permissions (id, name, resource, action, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now(), now())
        ON CONFLICT (name) DO NOTHING;
      `, [p.id, p.name, p.resource, p.action]);
    }

    // --- Admin Role ---
    const adminRoleId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, created_at, updated_at)
      VALUES ($1, 'admin', 'System administrator with full access', now(), now())
      ON CONFLICT (name) DO NOTHING;
    `, [adminRoleId]);

    // --- Link Role ↔ Permissions ---
    for (const p of permissions) {
      await queryRunner.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
      `, [adminRoleId, p.id]);
    }

    // --- Admin User ---
    // Password: admin123 (bcrypt hash with 12 rounds)
    const adminUserId = 'c3d4e5f6-a7b8-9012-cdef-345678901234';
    const passwordHash = '$2b$12$WIZvM.m4FSdRAodeJ4v5QeY49xKhMZD0Sp0ifrrvrp3YG6x17b7de';

    await queryRunner.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
      VALUES ($1, 'admin@example.com', $2, 'System', 'Administrator', 'active', now(), now())
      ON CONFLICT (email) DO NOTHING;
    `, [adminUserId, passwordHash]);

    // --- Link User ↔ Role ---
    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `, [adminUserId, adminRoleId]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM user_roles WHERE role_id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE role_id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';`);
    await queryRunner.query(`DELETE FROM users WHERE email = 'admin@example.com';`);
    await queryRunner.query(`DELETE FROM roles WHERE name = 'admin';`);
    await queryRunner.query(`DELETE FROM permissions WHERE name LIKE '%:%';`);
  }
}
