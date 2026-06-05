import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLaboratoryTables20250604000001 implements MigrationInterface {
  name = 'CreateLaboratoryTables20250604000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── TESTING SERVICES ─────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testing_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
        measurement_unit VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── LABORATORIES ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS laboratories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        capacity INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── SAMPLE TYPES ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sample_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_services_code ON testing_services(code);
      CREATE INDEX IF NOT EXISTS idx_testing_services_active ON testing_services(is_active);
      CREATE INDEX IF NOT EXISTS idx_laboratories_active ON laboratories(is_active);
      CREATE INDEX IF NOT EXISTS idx_sample_types_code ON sample_types(code);
      CREATE INDEX IF NOT EXISTS idx_sample_types_active ON sample_types(is_active);
    `);

    // ─── PERMISSIONS ────────────────────────────────────────────────────

    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action) VALUES
        ('testing-services:read', 'testing-services', 'read'),
        ('testing-services:create', 'testing-services', 'create'),
        ('testing-services:update', 'testing-services', 'update'),
        ('testing-services:delete', 'testing-services', 'delete'),
        ('laboratories:read', 'laboratories', 'read'),
        ('laboratories:create', 'laboratories', 'create'),
        ('laboratories:update', 'laboratories', 'update'),
        ('laboratories:delete', 'laboratories', 'delete'),
        ('sample-types:read', 'sample-types', 'read'),
        ('sample-types:create', 'sample-types', 'create'),
        ('sample-types:update', 'sample-types', 'update'),
        ('sample-types:delete', 'sample-types', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'testing-services:read','testing-services:create','testing-services:update','testing-services:delete',
          'laboratories:read','laboratories:create','laboratories:update','laboratories:delete',
          'sample-types:read','sample-types:create','sample-types:update','sample-types:delete'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sample_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS laboratories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS testing_services;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource IN (
          'testing-services','laboratories','sample-types'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource IN (
        'testing-services','laboratories','sample-types'
      );
    `);
  }
}
