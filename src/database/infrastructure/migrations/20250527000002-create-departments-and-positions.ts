import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentsAndPositions20250527000002 implements MigrationInterface {
  name = 'CreateDepartmentsAndPositions20250527000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, department_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
      CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
      CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);
    `);

    // Add employee_id column to users table to link user accounts to employees
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id UUID;
    `);

    // Seed permissions for departments and positions
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('departments:read', 'departments', 'read'),
        ('departments:create', 'departments', 'create'),
        ('departments:update', 'departments', 'update'),
        ('departments:delete', 'departments', 'delete'),
        ('positions:read', 'positions', 'read'),
        ('positions:create', 'positions', 'create'),
        ('positions:update', 'positions', 'update'),
        ('positions:delete', 'positions', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign new permissions to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'departments:read', 'departments:create', 'departments:update', 'departments:delete',
          'positions:read', 'positions:create', 'positions:update', 'positions:delete'
        )
      ON CONFLICT DO NOTHING;
    `);

    // Assign to hr_manager role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'hr_manager'
        AND p.name IN (
          'departments:read', 'departments:create', 'departments:update', 'departments:delete',
          'positions:read', 'positions:create', 'positions:update', 'positions:delete'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS employee_id;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_positions_is_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_departments_is_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_positions_department;`);
    await queryRunner.query(`DROP TABLE IF EXISTS positions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'departments:read', 'departments:create', 'departments:update', 'departments:delete',
          'positions:read', 'positions:create', 'positions:update', 'positions:delete'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'departments:read', 'departments:create', 'departments:update', 'departments:delete',
        'positions:read', 'positions:create', 'positions:update', 'positions:delete'
      );
    `);
  }
}
