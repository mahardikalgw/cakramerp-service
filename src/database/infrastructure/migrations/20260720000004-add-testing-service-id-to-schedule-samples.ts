import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestingServiceIdToScheduleSamples20260720000004
  implements MigrationInterface
{
  name = 'AddTestingServiceIdToScheduleSamples20260720000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_schedule_samples
      ADD COLUMN IF NOT EXISTS testing_service_id UUID NULL;

      UPDATE lab_schedule_samples lss
      SET testing_service_id = lcs.testing_service_id
      FROM lab_contract_samples lcs
      WHERE lss.contract_sample_id = lcs.id
        AND lss.testing_service_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_schedule_samples
      DROP COLUMN IF EXISTS testing_service_id;
    `);
  }
}
