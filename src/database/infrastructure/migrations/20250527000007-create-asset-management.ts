import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAssetManagement20250527000007 implements MigrationInterface {
  name = 'CreateAssetManagement20250527000007'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_number VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        acquisition_date DATE NOT NULL,
        acquisition_cost NUMERIC(18,2) NOT NULL,
        salvage_value NUMERIC(18,2) NOT NULL DEFAULT 0,
        useful_life_months INTEGER NOT NULL,
        depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line',
        declining_balance_rate NUMERIC(5,4),
        total_estimated_units NUMERIC(18,2),
        units_produced_to_date NUMERIC(18,2) DEFAULT 0,
        current_book_value NUMERIC(18,2) NOT NULL,
        accumulated_depreciation NUMERIC(18,2) NOT NULL DEFAULT 0,
        depreciation_schedule VARCHAR(20) NOT NULL DEFAULT 'monthly',
        last_depreciation_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        location VARCHAR(255),
        assigned_to_employee_id UUID,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_depreciations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        period_date DATE NOT NULL,
        depreciation_amount NUMERIC(18,2) NOT NULL,
        accumulated_depreciation NUMERIC(18,2) NOT NULL,
        book_value_after NUMERIC(18,2) NOT NULL,
        method_used VARCHAR(50) NOT NULL,
        units_produced NUMERIC(18,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
      CREATE INDEX IF NOT EXISTS idx_assets_depreciation_method ON assets(depreciation_method);
      CREATE INDEX IF NOT EXISTS idx_asset_depreciations_asset ON asset_depreciations(asset_id);
      CREATE INDEX IF NOT EXISTS idx_asset_depreciations_period ON asset_depreciations(period_date);
    `)

    // Seed permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action)
      VALUES
        ('assets:read', 'assets', 'read'),
        ('assets:create', 'assets', 'create'),
        ('assets:update', 'assets', 'update'),
        ('assets:delete', 'assets', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `)

    // Assign to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN ('assets:read', 'assets:create', 'assets:update', 'assets:delete')
      ON CONFLICT DO NOTHING;
    `)

    // Assign to finance_manager role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'finance_manager'
        AND p.name IN ('assets:read', 'assets:create', 'assets:update', 'assets:delete')
      ON CONFLICT DO NOTHING;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_asset_depreciations_period;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_asset_depreciations_asset;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_depreciation_method;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_category;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_status;`)
    await queryRunner.query(`DROP TABLE IF EXISTS asset_depreciations;`)
    await queryRunner.query(`DROP TABLE IF EXISTS assets;`)
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('assets:read', 'assets:create', 'assets:update', 'assets:delete')
      );
    `)
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('assets:read', 'assets:create', 'assets:update', 'assets:delete');
    `)
  }
}
