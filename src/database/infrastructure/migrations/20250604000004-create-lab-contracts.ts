import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabContracts20250604000004 implements MigrationInterface {
  name = 'CreateLabContracts20250604000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── LAB CONTRACTS ─────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        project_id UUID,
        project_name VARCHAR(255),
        start_date DATE,
        end_date DATE,
        contract_value NUMERIC(18,2),
        total_quota INTEGER,
        used_quota INTEGER DEFAULT 0,
        remaining_quota INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_by VARCHAR(255),
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_contract_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lab_contract_id UUID NOT NULL REFERENCES lab_contracts(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lab_contracts_status ON lab_contracts(status);
      CREATE INDEX IF NOT EXISTS idx_lab_contracts_customer ON lab_contracts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_lab_contract_attachments_contract ON lab_contract_attachments(lab_contract_id);
    `);

    // ─── PERMISSIONS ────────────────────────────────────────────────────

    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action) VALUES
        ('contracts:read', 'contracts', 'read'),
        ('contracts:create', 'contracts', 'create'),
        ('contracts:update', 'contracts', 'update'),
        ('contracts:delete', 'contracts', 'delete'),
        ('contracts:approve', 'contracts', 'approve'),
        ('purchase-orders:read', 'purchase-orders', 'read'),
        ('purchase-orders:create', 'purchase-orders', 'create'),
        ('purchase-orders:update', 'purchase-orders', 'update'),
        ('purchase-orders:delete', 'purchase-orders', 'delete'),
        ('purchase-orders:approve', 'purchase-orders', 'approve')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'contracts:read','contracts:create','contracts:update','contracts:delete','contracts:approve',
          'purchase-orders:read','purchase-orders:create','purchase-orders:update','purchase-orders:delete','purchase-orders:approve'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lab_contract_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS lab_contracts;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource IN ('contracts', 'purchase-orders')
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource IN ('contracts', 'purchase-orders');
    `);
  }
}
