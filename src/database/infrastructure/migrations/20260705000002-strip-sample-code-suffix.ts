import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Strip the auto-generated two-digit suffix (e.g. "-01", "-02") from
 * sample_code values that were created before the suffix was removed from
 * customer-portal.service.ts.
 *
 * Affected tables:
 *   - samples                            (sample_code column, has unique constraint)
 *   - post_approval_lab_contract_samples (sample_code column)
 *   - lab_schedule_samples               (sample_code column)
 *
 * For the samples table: duplicate rows that would arise after stripping
 * (e.g. "ABC-01" and "ABC-02" both becoming "ABC") are resolved by keeping
 * only the first row (oldest created_at) per base code + testing_request_id
 * group, and deleting the rest before updating.
 */
export class StripSampleCodeSuffix20260705000002 implements MigrationInterface {
  name = 'StripSampleCodeSuffix20260705000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── samples (has unique constraint on sample_code) ────────────────────────
    // Step 1: Delete duplicate rows keeping only the oldest per
    //         (testing_request_id, base_sample_code) group.
    await queryRunner.query(`
      DELETE FROM samples
      WHERE id IN (
        SELECT id FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY testing_request_id, REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
              ORDER BY created_at
            ) AS rn
          FROM samples
          WHERE sample_code ~ '-\\d{2}$'
        ) ranked
        WHERE rn > 1
      )
    `);

    // Step 2: Strip the suffix from the surviving rows.
    await queryRunner.query(`
      UPDATE samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);

    // ── post_approval_lab_contract_samples ────────────────────────────────────
    await queryRunner.query(`
      UPDATE post_approval_lab_contract_samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);

    // ── lab_schedule_samples ──────────────────────────────────────────────────
    await queryRunner.query(`
      UPDATE lab_schedule_samples
      SET sample_code = REGEXP_REPLACE(sample_code, '-\\d{2}$', '')
      WHERE sample_code ~ '-\\d{2}$'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add -NN suffix using row number within each testing_request_id group.
    // Only rows whose base code appears more than once get the suffix.
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

    // post_approval_lab_contract_samples — group by contract_id.
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

