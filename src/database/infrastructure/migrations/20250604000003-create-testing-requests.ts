import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestingRequests20250604000003 implements MigrationInterface {
  name = 'CreateTestingRequests20250604000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── TESTING REQUESTS ─────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testing_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        project_location VARCHAR(255),
        testing_type VARCHAR(50),
        sample_quantity INTEGER,
        schedule_date DATE,
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_by VARCHAR(255),
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testing_request_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        testing_request_id UUID NOT NULL REFERENCES testing_requests(id) ON DELETE CASCADE,
        testing_service_id UUID NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        sample_quantity INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ─── INDEXES ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testing_requests_status ON testing_requests(status);
      CREATE INDEX IF NOT EXISTS idx_testing_requests_customer ON testing_requests(customer_id);
      CREATE INDEX IF NOT EXISTS idx_testing_requests_number ON testing_requests(request_number);
      CREATE INDEX IF NOT EXISTS idx_testing_request_lines_request ON testing_request_lines(testing_request_id);
    `);

    // ─── PERMISSIONS ────────────────────────────────────────────────────

    await queryRunner.query(`
      INSERT INTO permissions (name, resource, action) VALUES
        ('testing-requests:read', 'testing-requests', 'read'),
        ('testing-requests:create', 'testing-requests', 'create'),
        ('testing-requests:update', 'testing-requests', 'update'),
        ('testing-requests:delete', 'testing-requests', 'delete'),
        ('testing-requests:submit', 'testing-requests', 'submit'),
        ('testing-requests:approve', 'testing-requests', 'approve')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'testing-requests:read','testing-requests:create','testing-requests:update','testing-requests:delete',
          'testing-requests:submit','testing-requests:approve'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS testing_request_lines;`);
    await queryRunner.query(`DROP TABLE IF EXISTS testing_requests;`);
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'testing-requests'
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource = 'testing-requests';
    `);
  }
}
