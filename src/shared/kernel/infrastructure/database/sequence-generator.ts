import { DataSource } from 'typeorm';

export interface SequenceGeneratorOptions {
  /**
   * Literal prefix the generated numbers start with, including the
   * year segment if year-scoped (e.g. `SPL-2026-`, `LPO-2026-`).
   *
   * For non-year-scoped sequences (e.g. `CTI-`, `CI-`) pass the
   * static prefix here.
   */
  prefix: string;

  /**
   * Total digits to pad the suffix with. Defaults to 5 (matches
   * `SPL-2026-00001`). Use 4 for `SO-2026-0001`, 6 for `CTI-000001`.
   */
  padLength?: number;

  /**
   * PostgreSQL advisory-lock key. MUST be unique per sequence so
   * unrelated sequences don't block each other. Use a stable 32-bit
   * signed integer per generator.
   */
  lockKey: number;
}

/**
 * Atomically generates the next number for a prefix-scoped sequence
 * using a PostgreSQL advisory lock. The lock + max query + unlock all
 * run on the SAME dedicated connection so the session-scoped lock
 * actually serialises concurrent callers (TypeORM QueryRunner's
 * `connect()` pins a single physical connection from the pool).
 *
 * Why this exists:
 *  1. Old implementations used `ORDER BY xxx DESC LIMIT 1` against a
 *     string column. That misorders `...00009 > ...00010` the moment
 *     the suffix reaches two digits, producing duplicate numbers that
 *     collide with the unique constraint.
 *  2. The same implementations often filtered `deleted_at IS NULL` on
 *     the assumption that soft-deleted rows should be skipped. But
 *     because the generated number is `UNIQUE` at the DB level, the
 *     soft-deleted row still occupies that number — skipping it just
 *     makes the next insert collide. So we MUST include soft-deleted
 *     rows in the MAX query.
 *  3. Without an advisory lock, two concurrent `getLast + save` calls
 *     read the same `last`, both compute `last + 1`, and the loser
 *     hits a unique-constraint violation.
 *
 * Usage:
 *   const seq = new SequenceGenerator(dataSource, {
 *     prefix: `SPL-${year}-`,
 *     padLength: 5,
 *     lockKey: 987000001,
 *   });
 *   const sampleCode = await seq.next('sample_code', 'samples');
 */
export class SequenceGenerator {
  constructor(
    private readonly dataSource: DataSource,
    private readonly options: SequenceGeneratorOptions,
  ) {}

  /**
   * Generate the next value of a sequence whose number lives in a
   * single string column of a single table.
   *
   * The query joins the lock and the MAX query on a single physical
   * connection, so the session-scoped `pg_advisory_lock` actually
   * serialises concurrent callers.
   *
   * Soft-deleted rows ARE included in the MAX query. The generated
   * number has a UNIQUE constraint at the DB level, so the
   * soft-deleted row still occupies that number — skipping it just
   * makes the next insert collide. This is why the gold-standard
   * `testing_request` repository intentionally does NOT filter
   * `deleted_at IS NULL` in its sequence query.
   */
  async next(columnName: string, tableName: string): Promise<string> {
    const { prefix, padLength = 5, lockKey } = this.options;
    const capture = `${escapeForRegex(prefix)}(\\d+)`;
    const likePattern = `${prefix}%`;
    const tableIdent = quoteIdent(tableName);
    const columnIdent = quoteIdent(columnName);
    const columnRef = `${tableIdent}.${columnIdent}`;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`SELECT pg_advisory_lock($1)`, [lockKey]);
      try {
        const rows: { max_seq: number | null }[] = await qr.query(
          `SELECT MAX(
                   CAST(
                     SUBSTRING(${columnRef} FROM $1)
                     AS INTEGER
                   )
                 ) AS max_seq
             FROM ${tableIdent}
            WHERE ${columnRef} LIKE $2`,
          [capture, likePattern],
        );

        const maxSeq = rows[0]?.max_seq ?? null;
        const next = maxSeq !== null ? Number(maxSeq) + 1 : 1;
        return `${prefix}${String(next).padStart(padLength, '0')}`;
      } finally {
        await qr.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
      }
    } finally {
      await qr.release();
    }
  }
}

/**
 * Escape a literal string for safe inclusion as a regex pattern inside
 * a SUBSTRING ... FROM $1 expression. PostgreSQL's POSIX-style regex
 * treats these characters as special; everything else is taken
 * literally.
 */
function escapeForRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely quote an identifier for inclusion in raw SQL. Only used for
 * trusted schema/table names that come from the application code.
 */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Stable 32-bit advisory-lock keys, one per prefix. Generated once
 * from the prefix string so each sequence has its own lock and
 * concurrent generators don't block each other.
 */
export const ADVISORY_LOCK_KEYS = {
  SAMPLE: 987000001,
  CERTIFICATE: 987000002,
  REPORT: 987000003,
  TEST_RESULT: 987000004,
  CONTRACT: 987000005,
  POST_APPROVAL_CONTRACT: 987000006,
  LAB_PO: 987000007,
  REQUEST: 987000008, // testing_request
  QUOTATION: 987000009,
  SALES_ORDER: 987000010,
  SALES_RETURN: 987000011,
  PURCHASE_ORDER: 987000012,
  GRN: 987000013,
  SPENDING: 987000014,
  CONTRACT_INVOICE: 987000015,
  CONTRACT_TEST_INVOICE: 987000016,
} as const;

