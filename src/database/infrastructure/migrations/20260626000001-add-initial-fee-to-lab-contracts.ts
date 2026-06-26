import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInitialFeeToLabContracts20260626000001
  implements MigrationInterface
{
  name = 'AddInitialFeeToLabContracts20260626000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new column. Defaults to 0 so existing rows are valid immediately.
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        ADD COLUMN IF NOT EXISTS initial_fee NUMERIC(18,2) DEFAULT 0
    `);

    // Backfill existing contract-billing contracts: the upfront fee
    // (excluding tax) was previously persisted as `base_amount`, which equals
    // `downPaymentAmount - taxAmount`. Copy that value into the new column
    // so the customer's paid-upfront fee is preserved.
    await queryRunner.query(`
      UPDATE lab_contracts
      SET initial_fee = base_amount
      WHERE billing_type = 'contract'
        AND (initial_fee IS NULL OR initial_fee = 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
        DROP COLUMN IF EXISTS initial_fee
    `);
  }
}
