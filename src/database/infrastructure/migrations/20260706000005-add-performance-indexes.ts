import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes20260706000005 implements MigrationInterface {
  name = 'AddPerformanceIndexes20260706000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Finance: journal_entry_lines — most queried table in financial reports
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entry_lines_journal_entry_id"
      ON "journal_entry_lines" ("journal_entry_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entry_lines_account_id"
      ON "journal_entry_lines" ("account_id")
    `);

    // Finance: journal_entries — date range and status filters
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_date"
      ON "journal_entries" ("date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_status"
      ON "journal_entries" ("status")
    `);

    // Finance: accounts — type filter used in every financial report
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_accounts_type"
      ON "accounts" ("type")
    `);

    // Warehouse: stock_ledger — item/warehouse lookups on every stock movement
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_item_id"
      ON "stock_ledger" ("item_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_warehouse_id"
      ON "stock_ledger" ("warehouse_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_ledger_item_warehouse"
      ON "stock_ledger" ("item_id", "warehouse_id")
    `);

    // Warehouse: item_stock_balances — unique lookup per item+warehouse
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_item_stock_balances_item_warehouse"
      ON "item_stock_balances" ("item_id", "warehouse_id")
    `);

    // Auth: refresh_tokens — expires_at for cleanup queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expires_at"
      ON "refresh_tokens" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_expires_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_item_stock_balances_item_warehouse"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_ledger_item_warehouse"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_ledger_warehouse_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_ledger_item_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_type"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entries_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_journal_entries_date"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entry_lines_account_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_journal_entry_lines_journal_entry_id"`,
    );
  }
}
