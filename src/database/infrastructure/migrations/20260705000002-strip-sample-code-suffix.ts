import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Strip the auto-generated two-digit suffix (e.g. "-01", "-02") from
 * sample_code values that were created before the suffix was removed from
 * customer-portal.service.ts.
 *
 * Affected tables:
 *   - samples                          (sample_code column)
 *   - post_approval_lab_contract_samples (sample_code column)
 *   - lab_schedule_samples             (sample_code column)
 *
 * Pattern matched: any sample_code ending in -NN where N is a digit,
 * e.g. "ABC-123-01" → "ABC-123".
 *
 * The down migration re-adds the suffix using the row's position within
 * its parent group so that a rollback produces the same values as the
 * original code did.  Because the original suffix was simply a sequential
 * counter within a request, the rollback uses ROW_NUMBER() ordered by
 * created_at to reconstruct it.
 */
export class StripSampleCodeSuffix20260705000002 implements MigrationInterface {
  name = 'StripSampleCodeSuffix20260705000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── samples ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      UPDATE samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);

    // ── post_approval_lab_contract_samples ───────────────────────────────────
    await queryRunner.query(`
      UPDATE post_approval_lab_contract_samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);

    // ── lab_schedule_samples ─────────────────────────────────────────────────
    await queryRunner.query(`
      UPDATE lab_schedule_samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add -NN suffix using row number within each testing_request_id group,
    // ordered by created_at, to mirror the original generation logic.
    // Only rows whose base code appears more than once in the same request
    // get the suffix (matching the original qty > 1 condition).
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          sample_code,
          testing_request_id,
          ROW_NUMBER() OVER (
            PARTITION BY testing_request_id, sample_code
            ORDER BY created_at
          ) AS rn,
          COUNT(*) OVER (
            PARTITION BY testing_request_id, sample_code
          ) AS cnt
        FROM samples
      )
      UPDATE samples s
      SET sample_code = s.sample_code || '-' || LPAD(r.rn::text, 2, '0')
      FROM ranked r
      WHERE s.id = r.id
        AND r.cnt > 1
    `);

    // post_approval_lab_contract_samples does not have testing_request_id;
    // use contract_id as the grouping key instead.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          sample_code,
          contract_id,
          ROW_NUMBER() OVER (
            PARTITION BY contract_id, sample_code
            ORDER BY created_at
          ) AS rn,
          COUNT(*) OVER (
            PARTITION BY contract_id, sample_code
          ) AS cnt
        FROM post_approval_lab_contract_samples
      )
      UPDATE post_approval_lab_contract_samples s
      SET sample_code = s.sample_code || '-' || LPAD(r.rn::text, 2, '0')
      FROM ranked r
      WHERE s.id = r.id
        AND r.cnt > 1
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          sample_code,
          schedule_id,
          ROW_NUMBER() OVER (
            PARTITION BY schedule_id, sample_code
            ORDER BY created_at
          ) AS rn,
          COUNT(*) OVER (
            PARTITION BY schedule_id, sample_code
          ) AS cnt
        FROM lab_schedule_samples
      )
      UPDATE lab_schedule_samples s
      SET sample_code = s.sample_code || '-' || LPAD(r.rn::text, 2, '0')
      FROM ranked r
      WHERE s.id = r.id
        AND r.cnt > 1
    `);
  }
}
