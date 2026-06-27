import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications20260615000001 implements MigrationInterface {
  name = 'CreateNotifications20260615000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        event_type            VARCHAR(60) NOT NULL,

        title                 VARCHAR(255) NOT NULL,
        message               TEXT NOT NULL,

        action_url            VARCHAR(500),
        action_label          VARCHAR(100),

        entity_type           VARCHAR(60),
        entity_id             UUID,

        email_sent            BOOLEAN NOT NULL DEFAULT false,
        email_sent_at         TIMESTAMP,
        push_sent             BOOLEAN NOT NULL DEFAULT false,
        push_sent_at          TIMESTAMP,
        push_error            TEXT,

        is_read               BOOLEAN NOT NULL DEFAULT false,
        read_at               TIMESTAMP,

        created_at            TIMESTAMP NOT NULL DEFAULT now(),
        updated_at            TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient
        ON notifications(recipient_user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread
        ON notifications(recipient_user_id, is_read)
        WHERE is_read = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON notifications(created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_entity
        ON notifications(entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        platform              VARCHAR(20) NOT NULL,
        token                 TEXT NOT NULL,
        device_name           VARCHAR(255),
        app_version           VARCHAR(50),
        os_version            VARCHAR(50),

        is_active             BOOLEAN NOT NULL DEFAULT true,
        invalidated_at        TIMESTAMP,

        created_at            TIMESTAMP NOT NULL DEFAULT now(),
        updated_at            TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tokens_user
        ON device_tokens(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tokens_active
        ON device_tokens(user_id, is_active)
        WHERE is_active = true
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token
        ON device_tokens(token)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_delivery_log (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id       UUID REFERENCES notifications(id) ON DELETE SET NULL,
        recipient_email       VARCHAR(255) NOT NULL,
        subject               VARCHAR(500) NOT NULL,

        provider              VARCHAR(50) NOT NULL DEFAULT 'resend',
        provider_message_id   VARCHAR(255),
        status                VARCHAR(50) NOT NULL,
        error_message         TEXT,

        created_at            TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_log_notification
        ON email_delivery_log(notification_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_delivery_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS device_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
  }
}
