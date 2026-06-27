import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderLineMissingColumns20260616100002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        ADD COLUMN IF NOT EXISTS purchase_request_line_id uuid,
        ADD COLUMN IF NOT EXISTS description text,
        ADD COLUMN IF NOT EXISTS line_type varchar(50) NOT NULL DEFAULT 'goods',
        ADD COLUMN IF NOT EXISTS fulfillment_status varchar(50) NOT NULL DEFAULT 'pending'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_order_lines
        DROP COLUMN IF EXISTS purchase_request_line_id,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS line_type,
        DROP COLUMN IF EXISTS fulfillment_status
    `);
  }
}
