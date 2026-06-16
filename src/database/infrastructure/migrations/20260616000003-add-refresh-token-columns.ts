import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenColumns20260616000003 implements MigrationInterface {
  name = 'AddRefreshTokenColumns20260616000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN IF NOT EXISTS ip_address varchar(45) NULL,
      ADD COLUMN IF NOT EXISTS user_agent varchar(500) NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      DROP COLUMN IF EXISTS ip_address,
      DROP COLUMN IF EXISTS user_agent;
    `);
  }
}
