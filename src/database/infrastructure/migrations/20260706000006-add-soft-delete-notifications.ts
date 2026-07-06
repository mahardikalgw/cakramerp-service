import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add deleted_at column to the notifications table.
 * The NotificationTypeOrmEntity extends SoftDeletableTypeOrmEntity but the
 * corresponding DB column was not included in any previous soft-delete migration,
 * causing a QueryFailedError on every query that references deleted_at.
 */
export class AddSoftDeleteNotifications20260706000006 implements MigrationInterface {
  name = 'AddSoftDeleteNotifications20260706000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at
        ON notifications (deleted_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_deleted_at
    `);

    await queryRunner.query(`
      ALTER TABLE notifications
        DROP COLUMN IF EXISTS deleted_at
    `);
  }
}
