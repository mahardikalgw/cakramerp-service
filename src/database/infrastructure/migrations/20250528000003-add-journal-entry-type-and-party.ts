import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJournalEntryTypeAndParty20250528000003 implements MigrationInterface {
  name = 'AddJournalEntryTypeAndParty20250528000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add journal_type to distinguish cash/payable/receivable journals
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_type VARCHAR(20) DEFAULT 'cash';
    `);
    // Add customer_id for receivable journals
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS customer_id UUID;
    `);
    // Add supplier_id for payable journals
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS supplier_id UUID;
    `);
    // Add customer/supplier name for display purposes
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS party_name VARCHAR(255);
    `);
    // Track if subsidiary ledger has been recorded (to avoid duplicates)
    await queryRunner.query(`
      ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS subsidiary_ledger_recorded BOOLEAN DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_journal_type ON journal_entries(journal_type);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_customer_id ON journal_entries(customer_id);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_supplier_id ON journal_entries(supplier_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_supplier_id;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_customer_id;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_journal_entries_journal_type;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS subsidiary_ledger_recorded;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS party_name;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS supplier_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS customer_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE journal_entries DROP COLUMN IF EXISTS journal_type;`,
    );
  }
}
