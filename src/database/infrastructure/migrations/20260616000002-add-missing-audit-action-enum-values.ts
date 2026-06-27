import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAuditActionEnumValues20260616000002 implements MigrationInterface {
  name = 'AddMissingAuditActionEnumValues20260616000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'login_failed'`,
    );
    await queryRunner.query(
      `ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'password_change'`,
    );
    await queryRunner.query(
      `ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'role_change'`,
    );
    await queryRunner.query(
      `ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'data_export'`,
    );
    await queryRunner.query(
      `ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'admin_action'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // To revert: recreate the enum without the added values and cast the column.
  }
}
