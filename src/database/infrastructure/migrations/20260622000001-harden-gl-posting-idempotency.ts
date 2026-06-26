import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenGlPostingIdempotency1718784000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Delete duplicate queue rows (keep oldest per source_type/source_id/event_type)
    // where status is pending or posted. Cancelled entries are exempt (can be replaced).
    await queryRunner.query(`
      DELETE FROM gl_posting_queue
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY source_type, source_id, event_type
                   ORDER BY created_at ASC
                 ) AS rn
          FROM gl_posting_queue
          WHERE status IN ('pending', 'posted')
        ) t
        WHERE t.rn > 1
      );
    `);

    // Step 2: Create partial unique index (only active statuses)
    // This prevents duplicate entries for the same source/event while the first
    // one is still pending or posted. Cancelled entries can be replaced.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_posting_queue_dedup
        ON gl_posting_queue (source_type, source_id, event_type)
        WHERE status IN ('pending', 'posted');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_gl_posting_queue_dedup;
    `);
  }
}
