import { MigrationInterface, QueryRunner } from 'typeorm';

export class LabFullGapImplementation20260608000001 implements MigrationInterface {
  name = 'LabFullGapImplementation20260608000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // 1. Verification & Activation tables
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(20) NOT NULL,
        entity_id UUID NOT NULL,
        entity_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        verified_by VARCHAR(255),
        verified_at TIMESTAMPTZ,
        rejection_reason TEXT,
        activated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_entity ON verifications(entity_type, entity_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS verification_checklist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
        item_type VARCHAR(30) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        document_url VARCHAR(500),
        verified BOOLEAN NOT NULL DEFAULT false,
        verified_by VARCHAR(255),
        verified_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_items_verification ON verification_checklist_items(verification_id)
    `);

    // ----------------------------------------------------------------
    // 2. Closing tables
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS closings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(20) NOT NULL,
        entity_id UUID NOT NULL,
        entity_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        closed_by VARCHAR(255),
        closed_at TIMESTAMPTZ,
        closing_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_closings_entity ON closings(entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS closing_checklist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        closing_id UUID NOT NULL REFERENCES closings(id) ON DELETE CASCADE,
        item_type VARCHAR(30) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_by VARCHAR(255),
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_closing_items_closing ON closing_checklist_items(closing_id)
    `);

    // ----------------------------------------------------------------
    // 3. Report Distribution table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR(50) NOT NULL,
        document_id UUID NOT NULL,
        document_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255),
        channel VARCHAR(20) NOT NULL,
        recipient_email VARCHAR(255),
        recipient_name VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        failure_reason TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distributions_document ON report_distributions(document_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distributions_customer ON report_distributions(customer_id)
    `);

    // ----------------------------------------------------------------
    // 4. Archived Documents table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS archived_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        document_number VARCHAR(50) NOT NULL,
        minio_path VARCHAR(500) NOT NULL,
        minio_bucket VARCHAR(100) NOT NULL,
        content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
        file_size BIGINT,
        customer_id UUID,
        customer_name VARCHAR(255),
        archived_by VARCHAR(255),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        retention_period_days INT NOT NULL DEFAULT 1825,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_archived_documents_entity ON archived_documents(document_type, entity_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_archived_documents_customer ON archived_documents(customer_id)
    `);

    // ----------------------------------------------------------------
    // 5. Lab Certificates table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lab_certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        certificate_number VARCHAR(50) NOT NULL UNIQUE,
        testing_request_id UUID NOT NULL,
        testing_request_number VARCHAR(50) NOT NULL,
        test_result_id UUID,
        result_number VARCHAR(50),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        sample_code VARCHAR(50),
        testing_service_id UUID,
        service_name VARCHAR(255),
        qr_hash VARCHAR(255),
        issued_by VARCHAR(255),
        issued_at TIMESTAMPTZ,
        revoked_by VARCHAR(255),
        revoked_at TIMESTAMPTZ,
        revocation_reason TEXT,
        minio_path VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_testing_request ON lab_certificates(testing_request_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_qr_hash ON lab_certificates(qr_hash)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_customer ON lab_certificates(customer_id)
    `);

    // ----------------------------------------------------------------
    // 6. In-App Notifications table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON in_app_notifications(user_id, read)
    `);

    // ----------------------------------------------------------------
    // 7. Payment Methods table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        bank_name VARCHAR(255),
        account_number VARCHAR(100),
        account_holder VARCHAR(255),
        virtual_account_pattern VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ----------------------------------------------------------------
    // 8. Payment Evidences table
    // ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_evidences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lab_purchase_order_id UUID,
        lab_contract_id UUID,
        amount DECIMAL(18,2) NOT NULL,
        payment_method_id UUID,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        verified_by VARCHAR(255),
        verified_at TIMESTAMPTZ,
        rejection_reason TEXT,
        submitted_by VARCHAR(255),
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_evidences_po ON payment_evidences(lab_purchase_order_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_evidences_contract ON payment_evidences(lab_contract_id)
    `);

    // ----------------------------------------------------------------
    // 9. Seed default payment methods
    // ----------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO payment_methods (name, type, bank_name, account_number, account_holder, is_active)
      VALUES
        ('Bank Transfer BCA', 'bank_transfer', 'BCA', '1234567890', 'PT Cakra Merp', true),
        ('Virtual Account BCA', 'virtual_account', 'BCA', 'VA-890123456', 'PT Cakra Merp', true),
        ('Bank Transfer Mandiri', 'bank_transfer', 'Mandiri', '9876543210', 'PT Cakra Merp', true),
        ('Virtual Account Mandiri', 'virtual_account', 'Mandiri', 'VA-210987654', 'PT Cakra Merp', true)
      ON CONFLICT DO NOTHING
    `);

    // ----------------------------------------------------------------
    // 10. Add new permissions for lab modules
    // ----------------------------------------------------------------
    const newPermissions = [
      ['verifications:read', 'verifications', 'read'],
      ['verifications:create', 'verifications', 'create'],
      ['verifications:approve', 'verifications', 'approve'],
      ['closings:read', 'closings', 'read'],
      ['closings:approve', 'closings', 'approve'],
      ['certificates:read', 'certificates', 'read'],
      ['certificates:create', 'certificates', 'create'],
      ['certificates:approve', 'certificates', 'approve'],
      ['distributions:read', 'distributions', 'read'],
      ['distributions:create', 'distributions', 'create'],
      ['archives:read', 'archives', 'read'],
      ['payment-methods:read', 'payment-methods', 'read'],
      ['payment-methods:create', 'payment-methods', 'create'],
      ['payment-evidences:read', 'payment-evidences', 'read'],
      ['payment-evidences:create', 'payment-evidences', 'create'],
      ['payment-evidences:approve', 'payment-evidences', 'approve'],
      ['dashboard:admin', 'dashboard', 'admin'],
      ['dashboard:lab', 'dashboard', 'lab'],
      ['dashboard:customer', 'dashboard', 'customer'],
      ['quota:read', 'quota', 'read'],
    ];

    for (const [name, resource, action] of newPermissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant new permissions to admin role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'verifications:read', 'verifications:create', 'verifications:approve',
          'closings:read', 'closings:approve',
          'certificates:read', 'certificates:create', 'certificates:approve',
          'distributions:read', 'distributions:create',
          'archives:read',
          'payment-methods:read', 'payment-methods:create',
          'payment-evidences:read', 'payment-evidences:create', 'payment-evidences:approve',
          'dashboard:admin', 'dashboard:lab', 'dashboard:customer',
          'quota:read'
        )
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);

    // Grant relevant permissions to laboran role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'laboran'
        AND p.name IN (
          'certificates:read',
          'dashboard:lab',
          'payment-evidences:read'
        )
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payment_evidences`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_methods`);
    await queryRunner.query(`DROP TABLE IF EXISTS in_app_notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS lab_certificates`);
    await queryRunner.query(`DROP TABLE IF EXISTS archived_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_distributions`);
    await queryRunner.query(`DROP TABLE IF EXISTS closing_checklist_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS closings`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS verification_checklist_items`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS verifications`);

    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'verifications:read', 'verifications:create', 'verifications:approve',
        'closings:read', 'closings:approve',
        'certificates:read', 'certificates:create', 'certificates:approve',
        'distributions:read', 'distributions:create',
        'archives:read',
        'payment-methods:read', 'payment-methods:create',
        'payment-evidences:read', 'payment-evidences:create', 'payment-evidences:approve',
        'dashboard:admin', 'dashboard:lab', 'dashboard:customer',
        'quota:read'
      )
    `);
  }
}
