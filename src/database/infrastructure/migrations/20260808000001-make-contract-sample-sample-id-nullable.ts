import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeContractSampleSampleIdNullable20260808000001
  implements MigrationInterface
{
  name = 'MakeContractSampleSampleIdNullable20260808000001';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE lab_contract_samples ALTER COLUMN sample_id DROP NOT NULL`,
    );
    // Backfill contract_samples for contracts like a1ee... that have quota but 0 sample lines
    await queryRunner.query(`
      INSERT INTO lab_contract_samples (id, contract_id, sample_id, testing_service_id, service_name, sample_code, sample_quantity, unit_price, total_price, status, created_at, updated_at)
      SELECT gen_random_uuid(), c.id, NULL, trl.testing_service_id, COALESCE(trl.service_name, 'Unknown Service'), trl.sample_code, trl.sample_quantity, COALESCE(trl.unit_price,0), COALESCE(trl.unit_price,0) * COALESCE(trl.sample_quantity,0), 'pending', NOW(), NOW()
      FROM lab_contracts c
      JOIN testing_requests tr ON tr.id = c.testing_request_id
      JOIN testing_request_lines trl ON trl.testing_request_id = tr.id
      WHERE NOT EXISTS (SELECT 1 FROM lab_contract_samples lcs WHERE lcs.contract_id = c.id AND lcs.deleted_at IS NULL)
        AND c.deleted_at IS NULL
        AND tr.deleted_at IS NULL
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE lab_contract_samples ALTER COLUMN sample_id SET NOT NULL`,
    );
  }
}
