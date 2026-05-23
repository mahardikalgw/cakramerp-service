import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserColumns20250519000003 implements MigrationInterface {
  name = 'AddUserColumns20250519000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS department varchar(100) NULL,
      ADD COLUMN IF NOT EXISTS last_login timestamptz NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS department,
      DROP COLUMN IF EXISTS last_login;
    `);
  }
}
