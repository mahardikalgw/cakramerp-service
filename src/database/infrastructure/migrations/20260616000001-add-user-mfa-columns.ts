import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMfaColumns20260616000001 implements MigrationInterface {
  name = 'AddUserMfaColumns20260616000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS mfa_secret varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS mfa_backup_codes text NULL,
      ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamp NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS mfa_secret,
      DROP COLUMN IF EXISTS mfa_enabled,
      DROP COLUMN IF EXISTS mfa_backup_codes,
      DROP COLUMN IF EXISTS mfa_enabled_at;
    `);
  }
}
