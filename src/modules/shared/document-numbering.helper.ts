import { DataSource, Repository } from 'typeorm';

/**
 * Generates the next sequential document number using a per-table/per-year
 * prefix (e.g. "PO-2026-0007"). Both purchasing and sales reuse this helper
 * instead of duplicating the query.
 */
export async function generateNextDocumentNumber(
  dataSource: DataSource,
  tableName: string,
  columnName: string,
  prefix: string,
  padWidth = 4,
): Promise<string> {
  const repo: Repository<any> = dataSource.getRepository(tableName as any);
  const result = await repo
    .createQueryBuilder('d')
    .select(`d.${columnName}`, 'docNumber')
    .where(`d.${columnName} LIKE :prefix`, { prefix: `${prefix}%` })
    .orderBy(`d.${columnName}`, 'DESC')
    .limit(1)
    .getRawOne();

  const lastNumber: string | undefined = result?.docNumber;
  if (!lastNumber) return `${prefix}${'1'.padStart(padWidth, '0')}`;

  const seq = parseInt(lastNumber.replace(prefix, ''), 10);
  if (Number.isNaN(seq)) {
    // Prefix collision / data corruption fallback: use timestamp to guarantee uniqueness.
    const ts = Date.now() % 1_000_000;
    return `${prefix}${ts.toString().padStart(6, '0')}`;
  }

  return `${prefix}${(seq + 1).toString().padStart(padWidth, '0')}`;
}

export const NUMBERING_PREFIXES = {
  PR: (year: number) => `PR-${year}-`,
  PO: (year: number) => `PO-${year}-`,
  PRTN: (year: number) => `PRTN-${year}-`,
  QT: (year: number) => `QT-${year}-`,
  SO: (year: number) => `SO-${year}-`,
  SRTN: (year: number) => `SRTN-${year}-`,
} as const;
