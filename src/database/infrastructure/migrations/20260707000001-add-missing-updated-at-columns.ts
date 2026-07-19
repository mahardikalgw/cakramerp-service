import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add missing `updated_at` columns to tables that were created without it
 * but whose TypeORM entities inherit `@UpdateDateColumn` from TypeOrmBaseEntity.
 *
 * Tables affected:
 *   - lab_activity_logs (created in 20260607000001 without updated_at)
 *   - contract_test_invoice_results (created in 20260626000002 without updated_at)
 *   - email_delivery_log (created in 20260615000001 without updated_at AND without deleted_at)
 */
export class AddMissingUpdatedAtColumns20260707000001 implements MigrationInterface {
  name = 'AddMissingUpdatedAtColumns20260707000001';

  private async addUpdatedAt(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        ) AND NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${table}'
            AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE "${table}" ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
        END IF;
      END $$;
    `);
  }

  private async addDeletedAt(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '${table}'
        ) AND NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${table}'
            AND column_name = 'deleted_at'
        ) THEN
          ALTER TABLE "${table}" ADD COLUMN deleted_at TIMESTAMPTZ NULL;
          CREATE INDEX IF NOT EXISTS "idx_${table}_deleted_at" ON "${table}" (deleted_at);
        END IF;
      END $$;
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addUpdatedAt(queryRunner, 'lab_activity_logs');
    await this.addUpdatedAt(queryRunner, 'contract_test_invoice_results');
    await this.addUpdatedAt(queryRunner, 'email_delivery_log');
    await this.addDeletedAt(queryRunner, 'email_delivery_log');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_delivery_log" DROP COLUMN IF EXISTS deleted_at`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_email_delivery_log_deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_delivery_log" DROP COLUMN IF EXISTS updated_at`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_test_invoice_results" DROP COLUMN IF EXISTS updated_at`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_activity_logs" DROP COLUMN IF EXISTS updated_at`,
    );
  }
}
