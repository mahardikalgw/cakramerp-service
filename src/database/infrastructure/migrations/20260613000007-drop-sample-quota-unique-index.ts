import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSampleQuotaUniqueIndex20260613000007 implements MigrationInterface {
  name = 'DropSampleQuotaUniqueIndex20260613000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sample_quotas_request_service`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sample_quotas_request_service
        ON sample_quotas(testing_request_id, testing_service_id)
    `);
  }
}
