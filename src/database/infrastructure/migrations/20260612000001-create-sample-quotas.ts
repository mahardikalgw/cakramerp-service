import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSampleQuotas20260612000001 implements MigrationInterface {
  name = 'CreateSampleQuotas20260612000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sample_quotas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        testing_request_id UUID NOT NULL,
        testing_service_id UUID NOT NULL,
        testing_service_name VARCHAR(255) NOT NULL,
        customer_id UUID NOT NULL,
        total_quota INTEGER NOT NULL DEFAULT 0,
        used_quota INTEGER NOT NULL DEFAULT 0,
        remaining_quota INTEGER NOT NULL DEFAULT 0,
        granted_at TIMESTAMP NOT NULL,
        granted_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_sample_quotas_request
          FOREIGN KEY (testing_request_id)
          REFERENCES testing_requests(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sample_quotas_request
        ON sample_quotas(testing_request_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sample_quotas_service
        ON sample_quotas(testing_service_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sample_quotas_customer
        ON sample_quotas(customer_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sample_quotas_request_service
        ON sample_quotas(testing_request_id, testing_service_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sample_quotas`);
  }
}
