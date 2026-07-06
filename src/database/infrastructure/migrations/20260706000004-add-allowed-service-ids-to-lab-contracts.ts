import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add allowed_service_ids column to lab_contracts table.
 *
 * For contract-billing contracts this stores the JSON array of testing service
 * UUIDs that were selected by the customer in the original testing request
 * lines.  addContractSamples() will reject any sample whose testingServiceId
 * is not in this list, enforcing scope-of-testing constraints.
 *
 * Null means "no restriction" (cash-billing contracts and legacy contract
 * records created before this migration).
 */
export class AddAllowedServiceIdsToLabContracts20260706000004 implements MigrationInterface {
  name = 'AddAllowedServiceIdsToLabContracts20260706000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      ADD COLUMN IF NOT EXISTS allowed_service_ids JSONB NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      DROP COLUMN IF EXISTS allowed_service_ids
    `);
  }
}
