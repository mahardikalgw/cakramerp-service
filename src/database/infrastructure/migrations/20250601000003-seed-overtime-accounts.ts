import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedOvertimeAccounts20250601000003 implements MigrationInterface {
  name = 'SeedOvertimeAccounts20250601000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES
        ('5103', 'Biaya Lembur', 'expense', true),
        ('2320', 'Hutang Lembur', 'liability', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // Add permissions for leave approval, discrepancy resolution, profile change approval
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('leave:approve', 'leave', 'approve'),
        ('attendance:approve', 'attendance', 'approve')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to admin and supervisor roles
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'supervisor', 'hr_manager')
        AND p.name IN ('leave:approve', 'attendance:approve')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('leave:approve', 'attendance:approve'));`,
    );
    await queryRunner.query(
      `DELETE FROM permissions WHERE name IN ('leave:approve', 'attendance:approve');`,
    );
    await queryRunner.query(
      `DELETE FROM accounts WHERE code IN ('5103', '2320');`,
    );
  }
}
