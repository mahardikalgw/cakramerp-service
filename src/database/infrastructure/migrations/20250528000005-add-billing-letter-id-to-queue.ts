import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBillingLetterIdToQueue20250528000005 implements MigrationInterface {
  name = 'AddBillingLetterIdToQueue20250528000005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE gl_posting_queue ADD COLUMN IF NOT EXISTS billing_letter_id UUID;`)
    await queryRunner.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS billing_letter_id UUID;`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_gl_posting_queue_billing_letter ON gl_posting_queue(billing_letter_id);`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_journal_entries_billing_letter ON journal_entries(billing_letter_id);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_journal_entries_billing_letter;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gl_posting_queue_billing_letter;`)
    await queryRunner.query(`ALTER TABLE journal_entries DROP COLUMN IF EXISTS billing_letter_id;`)
    await queryRunner.query(`ALTER TABLE gl_posting_queue DROP COLUMN IF EXISTS billing_letter_id;`)
  }
}
