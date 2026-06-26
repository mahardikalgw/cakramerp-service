import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownpaymentProofToLabContracts1718668800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS down_payment_proof_url VARCHAR(500) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS down_payment_proof_filename VARCHAR(255) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE lab_contracts ADD COLUMN IF NOT EXISTS down_payment_proof_uploaded_at TIMESTAMPTZ NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lab_contracts DROP COLUMN IF EXISTS down_payment_proof_url;`);
    await queryRunner.query(`ALTER TABLE lab_contracts DROP COLUMN IF EXISTS down_payment_proof_filename;`);
    await queryRunner.query(`ALTER TABLE lab_contracts DROP COLUMN IF EXISTS down_payment_proof_uploaded_at;`);
  }
}
