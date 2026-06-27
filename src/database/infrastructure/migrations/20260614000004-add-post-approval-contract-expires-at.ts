import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostApprovalContractExpiresAt20260614000004 implements MigrationInterface {
  name = 'AddPostApprovalContractExpiresAt20260614000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lab_contracts
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE lab_contracts DROP COLUMN IF EXISTS expires_at`,
    );
  }
}
