import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20250519000001 implements MigrationInterface {
  name = 'InitialSchema20250519000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        first_name varchar(100) NOT NULL,
        last_name varchar(100) NOT NULL,
        status enum ('active', 'inactive', 'suspended') DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // roles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL UNIQUE,
        description varchar(255) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL UNIQUE,
        resource varchar(100) NOT NULL,
        action varchar(50) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // refresh_tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    `);

    // role_permissions join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id uuid NOT NULL,
        permission_id uuid NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );
    `);

    // user_roles join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
  }
}
