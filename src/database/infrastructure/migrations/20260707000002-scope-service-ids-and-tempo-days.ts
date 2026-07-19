import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeServiceIdsAndTempoDays20260707000002 implements MigrationInterface {
  name = 'ScopeServiceIdsAndTempoDays20260707000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add scope_of_testing_service_ids UUID[] to testing_requests
    await queryRunner.query(`
      ALTER TABLE testing_requests
      ADD COLUMN IF NOT EXISTS scope_of_testing_service_ids UUID[] DEFAULT NULL
    `);

    // 2. Rename contract_tempo_months → contract_tempo_days in testing_requests
    //    and multiply existing values by 30 to convert months → days
    await queryRunner.query(`
      ALTER TABLE testing_requests
      ADD COLUMN IF NOT EXISTS contract_tempo_days INTEGER
    `);
    await queryRunner.query(`
      UPDATE testing_requests
      SET contract_tempo_days = contract_tempo_months * 30
      WHERE contract_tempo_months IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE testing_requests
      DROP COLUMN IF EXISTS contract_tempo_months
    `);

    // 3. Same rename for lab_contracts
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      ADD COLUMN IF NOT EXISTS contract_tempo_days INTEGER
    `);
    await queryRunner.query(`
      UPDATE lab_contracts
      SET contract_tempo_days = contract_tempo_months * 30
      WHERE contract_tempo_months IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      DROP COLUMN IF EXISTS contract_tempo_months
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: add contract_tempo_months back, divide by 30
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      ADD COLUMN IF NOT EXISTS contract_tempo_months INTEGER
    `);
    await queryRunner.query(`
      UPDATE lab_contracts
      SET contract_tempo_months = GREATEST(1, contract_tempo_days / 30)
      WHERE contract_tempo_days IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      DROP COLUMN IF EXISTS contract_tempo_days
    `);

    await queryRunner.query(`
      ALTER TABLE testing_requests
      ADD COLUMN IF NOT EXISTS contract_tempo_months INTEGER
    `);
    await queryRunner.query(`
      UPDATE testing_requests
      SET contract_tempo_months = GREATEST(1, contract_tempo_days / 30)
      WHERE contract_tempo_days IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE testing_requests
      DROP COLUMN IF EXISTS contract_tempo_days
    `);

    await queryRunner.query(`
      ALTER TABLE testing_requests
      DROP COLUMN IF EXISTS scope_of_testing_service_ids
    `);
  }
}
