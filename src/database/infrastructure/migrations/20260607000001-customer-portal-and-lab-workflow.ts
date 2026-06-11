import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerPortalAndLabWorkflow20260607000001 implements MigrationInterface {
  name = 'CustomerPortalAndLabWorkflow20260607000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // 1. Customer portal fields
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS portal_registered_at TIMESTAMPTZ
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id)`,
    );

    // ----------------------------------------------------------------
    // 2. Testing request: customer + laboran assignment + new statuses
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(20) NOT NULL DEFAULT 'admin',
        ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS project_address TEXT,
        ADD COLUMN IF NOT EXISTS preferred_schedule_date DATE,
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS assigned_laboran_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS assigned_laboran_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS assignment_notes TEXT
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_requests_laboran ON testing_requests(assigned_laboran_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_testing_requests_customer_user ON testing_requests(customer_user_id)`,
    );

    // ----------------------------------------------------------------
    // 3. Lab activity log table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        testing_request_id UUID NOT NULL REFERENCES testing_requests(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL,
        performed_by_name VARCHAR(255),
        performed_by_role VARCHAR(50),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_activity_logs_request ON lab_activity_logs(testing_request_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lab_activity_logs_created ON lab_activity_logs(created_at)`,
    );

    // ----------------------------------------------------------------
    // 4. Seed laboran role + permissions
    // ----------------------------------------------------------------
    // Insert role (idempotent)
    await queryRunner.query(`
      INSERT INTO roles (name, description)
      VALUES ('laboran', 'Laboratory technician — records and processes lab test results')
      ON CONFLICT (name) DO NOTHING
    `);

    // Seed customer role
    await queryRunner.query(`
      INSERT INTO roles (name, description)
      VALUES ('customer', 'Customer portal user — submits and tracks lab test requests')
      ON CONFLICT (name) DO NOTHING
    `);

    // New permissions needed
    const newPermissions = [
      ['testing-requests:assign', 'testing-requests', 'assign'],
      [
        'testing-requests:generate-report',
        'testing-requests',
        'generate-report',
      ],
    ];
    for (const [name, resource, action] of newPermissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant laboran permissions
    const laboranPerms = [
      'testing-requests:read',
      'samples:read',
      'samples:create',
      'samples:update',
      'test-results:read',
      'test-results:create',
      'test-results:update',
      'test-results:submit',
      'daily-reports:read',
      'daily-reports:create',
      'daily-reports:submit',
      'schedules:read',
      'schedules:update',
      'testing-services:read',
      'laboratories:read',
      'sample-types:read',
    ];

    for (const permName of laboranPerms) {
      await queryRunner.query(
        `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.name = 'laboran' AND p.name = $1
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
          )
      `,
        [permName],
      );
    }

    // Grant new assign + generate-report permissions to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.name IN ('testing-requests:assign', 'testing-requests:generate-report')
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lab_activity_logs`);

    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS submitted_by,
        DROP COLUMN IF EXISTS customer_user_id,
        DROP COLUMN IF EXISTS project_address,
        DROP COLUMN IF EXISTS preferred_schedule_date,
        DROP COLUMN IF EXISTS priority,
        DROP COLUMN IF EXISTS assigned_laboran_id,
        DROP COLUMN IF EXISTS assigned_laboran_name,
        DROP COLUMN IF EXISTS assigned_at,
        DROP COLUMN IF EXISTS assignment_notes
    `);

    await queryRunner.query(`
      ALTER TABLE customers
        DROP COLUMN IF EXISTS user_id,
        DROP COLUMN IF EXISTS portal_access,
        DROP COLUMN IF EXISTS portal_registered_at
    `);

    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('laboran', 'customer')`,
    );
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'testing-requests:assign', 'testing-requests:generate-report'
      )
    `);
  }
}
