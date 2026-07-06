import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add optional username column to the users table.
 * Username is unique (when set) and allows login without an email address.
 */
export class AddUsernameToUsers20260706000002 implements MigrationInterface {
  name = 'AddUsernameToUsers20260706000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
      ON users (username)
      WHERE username IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_username
    `);

    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS username
    `);
  }
}
