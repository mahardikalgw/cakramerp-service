import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestCustomerUser20260608000005 implements MigrationInterface {
  name = 'SeedTestCustomerUser20260608000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status)
      VALUES (
        gen_random_uuid(),
        'customer@test.com',
        '$2b$12$aNIwUpRypXcmMEuvAjOziuSoexNy1uVU0/j4WS3neQ0LWTEEccSba',
        'Test',
        'Customer',
        'active'
      )
      ON CONFLICT (email) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'customer' AND p.name = 'testing-requests:cancel'
        AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id FROM users u, roles r
      WHERE u.email = 'customer@test.com' AND r.name = 'customer'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id)
    `);

    await queryRunner.query(`
      INSERT INTO customers (id, name, email, phone, address, city, contact_person, status, user_id, portal_access, portal_registered_at)
      SELECT gen_random_uuid(), 'Test Customer', 'customer@test.com', '021-1234567', 'Jl. Test No. 1, Jakarta', 'Jakarta', 'Test Customer', 'active', u.id, true, CURRENT_TIMESTAMP
      FROM users u WHERE u.email = 'customer@test.com'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM customers WHERE email = 'customer@test.com'
    `);
    await queryRunner.query(`
      DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = 'customer@test.com')
    `);
    await queryRunner.query(`
      DELETE FROM users WHERE email = 'customer@test.com'
    `);
  }
}
