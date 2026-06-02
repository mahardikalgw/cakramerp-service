import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpendings20250601000001 implements MigrationInterface {
  name = 'CreateSpendings20250601000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spendings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spending_number VARCHAR(50) NOT NULL UNIQUE,
        date DATE NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
        reference VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        gl_posting_queue_id UUID,
        journal_entry_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spendings_status ON spendings(status);
      CREATE INDEX IF NOT EXISTS idx_spendings_category ON spendings(category);
      CREATE INDEX IF NOT EXISTS idx_spendings_date ON spendings(date);
      CREATE INDEX IF NOT EXISTS idx_spendings_gl_queue ON spendings(gl_posting_queue_id);
      CREATE INDEX IF NOT EXISTS idx_spendings_journal ON spendings(journal_entry_id);
    `);

    // Permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('spendings:read', 'spendings', 'read'),
        ('spendings:create', 'spendings', 'create'),
        ('spendings:update', 'spendings', 'update'),
        ('spendings:delete', 'spendings', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'finance_manager', 'accountant')
        AND p.name IN ('spendings:read', 'spendings:create', 'spendings:update', 'spendings:delete')
      ON CONFLICT DO NOTHING;
    `);

    // Seed spending categories
    await queryRunner.query(`
      INSERT INTO accounts (code, name, type, is_active)
      VALUES
        ('6100', 'Biaya Operasional Kantor', 'expense', true),
        ('6200', 'Biaya Marketing', 'expense', true),
        ('6300', 'Biaya Transportasi', 'expense', true),
        ('6400', 'Biaya Utilitas', 'expense', true),
        ('6500', 'Biaya Pemeliharaan', 'expense', true),
        ('6600', 'Biaya Lain-lain', 'expense', true)
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spendings_journal;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spendings_gl_queue;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spendings_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spendings_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spendings_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS spendings;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('spendings:read', 'spendings:create', 'spendings:update', 'spendings:delete')
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('spendings:read', 'spendings:create', 'spendings:update', 'spendings:delete');
    `);
    await queryRunner.query(`
      DELETE FROM accounts WHERE code IN ('6100', '6200', '6300', '6400', '6500', '6600');
    `);
  }
}
