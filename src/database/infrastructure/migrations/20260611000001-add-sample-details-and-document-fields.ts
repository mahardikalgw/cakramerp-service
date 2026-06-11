import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSampleDetailsAndDocumentFields20260611000001 implements MigrationInterface {
  name = 'AddSampleDetailsAndDocumentFields20260611000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------
    // 1. Testing request lines: add sampleCode + sampleDescription
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ADD COLUMN IF NOT EXISTS sample_code       VARCHAR(100),
        ADD COLUMN IF NOT EXISTS sample_description TEXT
    `);

    // ----------------------------------------------------------------
    // 2. Testing requests: add document URL fields + quota_granted
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS additional_notes        TEXT,
        ADD COLUMN IF NOT EXISTS invoice_document_url    VARCHAR(500),
        ADD COLUMN IF NOT EXISTS po_document_url         VARCHAR(500),
        ADD COLUMN IF NOT EXISTS signed_document_url     VARCHAR(500),
        ADD COLUMN IF NOT EXISTS signed_document_filename VARCHAR(255),
        ADD COLUMN IF NOT EXISTS signed_document_uploaded_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS payment_proof_url       VARCHAR(500),
        ADD COLUMN IF NOT EXISTS payment_proof_filename  VARCHAR(255),
        ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS document_verified_at    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS document_verified_by    VARCHAR(255),
        ADD COLUMN IF NOT EXISTS quota_granted           BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS quota_granted_at        TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS quota_granted_by        VARCHAR(255)
    `);

    // ----------------------------------------------------------------
    // 3. Move testing service from line-level to request-level
    // ----------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE testing_requests
        ADD COLUMN IF NOT EXISTS testing_service_id UUID,
        ADD COLUMN IF NOT EXISTS service_name VARCHAR(255)
    `);

    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ALTER COLUMN testing_service_id DROP NOT NULL,
        ALTER COLUMN service_name DROP NOT NULL
    `);

    // ----------------------------------------------------------------
    // 4. Seed portal upload permissions
    // ----------------------------------------------------------------
    const newPermissions = [
      [
        'testing-requests:upload-document',
        'testing-requests',
        'upload-document',
      ],
      [
        'testing-requests:verify-documents',
        'testing-requests',
        'verify-documents',
      ],
      ['testing-requests:grant-quota', 'testing-requests', 'grant-quota'],
    ];

    for (const [name, resource, action] of newPermissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, resource, action],
      );
    }

    // Grant verify + grant-quota to admin
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin'
        AND p.name IN (
          'testing-requests:upload-document',
          'testing-requests:verify-documents',
          'testing-requests:grant-quota'
        )
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);

    // Grant upload-document to customer role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'customer'
        AND p.name = 'testing-requests:upload-document'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS quota_granted_by,
        DROP COLUMN IF EXISTS quota_granted_at,
        DROP COLUMN IF EXISTS quota_granted,
        DROP COLUMN IF EXISTS document_verified_by,
        DROP COLUMN IF EXISTS document_verified_at,
        DROP COLUMN IF EXISTS payment_proof_uploaded_at,
        DROP COLUMN IF EXISTS payment_proof_filename,
        DROP COLUMN IF EXISTS payment_proof_url,
        DROP COLUMN IF EXISTS signed_document_uploaded_at,
        DROP COLUMN IF EXISTS signed_document_filename,
        DROP COLUMN IF EXISTS signed_document_url,
        DROP COLUMN IF EXISTS po_document_url,
        DROP COLUMN IF EXISTS invoice_document_url,
        DROP COLUMN IF EXISTS additional_notes
    `);

    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        DROP COLUMN IF EXISTS sample_code,
        DROP COLUMN IF EXISTS sample_description
    `);

    await queryRunner.query(`
      ALTER TABLE testing_requests
        DROP COLUMN IF EXISTS testing_service_id,
        DROP COLUMN IF EXISTS service_name
    `);

    await queryRunner.query(`
      ALTER TABLE testing_request_lines
        ALTER COLUMN testing_service_id SET NOT NULL,
        ALTER COLUMN service_name SET NOT NULL
    `);

    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'testing-requests:upload-document',
        'testing-requests:verify-documents',
        'testing-requests:grant-quota'
      )
    `);
  }
}
