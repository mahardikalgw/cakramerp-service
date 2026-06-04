import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpendingIdToGlPostingQueue20250603000001 implements MigrationInterface {
  name = 'AddSpendingIdToGlPostingQueue20250603000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue
      ADD COLUMN IF NOT EXISTS spending_id UUID
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE gl_posting_queue
      DROP COLUMN IF EXISTS spending_id
    `);
  }
}
