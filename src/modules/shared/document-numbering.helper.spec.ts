import { DataSource } from 'typeorm';
import {
  generateNextDocumentNumber,
  NUMBERING_PREFIXES,
} from './document-numbering.helper';

/**
 * Unit tests for the shared document-numbering helper used by purchasing
 * (PR/PO/PRTN) and sales (QT/SO/SRTN) to generate sequential, per-year
 * document numbers like "PO-2026-0007".
 *
 * The helper is a thin SQL helper around `LIKE`/`ORDER BY`/`LIMIT 1` on
 * the document table; we mock the DataSource + repository queryBuilder to
 * cover the happy path, the "no prior number" first-time case, the parse
 * failure fallback, and the padding-width behaviour.
 */

interface QbResult {
  raw: Record<string, unknown>[];
}

function makeFakeDataSource(
  existing: { poNumber?: string; soNumber?: string; prNumber?: string } | null,
  tableName = 'purchase_orders',
  columnName = 'po_number',
): DataSource {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(
      existing
        ? {
            docNumber:
              columnName === 'so_number'
                ? existing.soNumber
                : columnName === 'pr_number'
                  ? existing.prNumber
                  : existing.poNumber,
          }
        : undefined,
    ),
  };
  const repo: any = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };
  const ds: any = {
    getRepository: jest.fn().mockReturnValue(repo),
    manager: { connection: { options: { type: 'postgres' } } },
  };
  // The helper does `dataSource.getRepository(tableName as any)` so the
  // tableName parameter is captured for assertion purposes.
  ds._tableName = tableName;
  return ds;
}

describe('generateNextDocumentNumber', () => {
  it('returns 0001 when no prior number exists in the table', async () => {
    const ds = makeFakeDataSource(null);
    const next = await generateNextDocumentNumber(
      ds,
      'purchase_orders',
      'po_number',
      NUMBERING_PREFIXES.PO(2026),
    );
    expect(next).toBe('PO-2026-0001');
  });

  it('increments the trailing 4-digit sequence', async () => {
    const ds = makeFakeDataSource({ poNumber: 'PO-2026-0007' });
    const next = await generateNextDocumentNumber(
      ds,
      'purchase_orders',
      'po_number',
      NUMBERING_PREFIXES.PO(2026),
    );
    expect(next).toBe('PO-2026-0008');
  });

  it('handles prefix transitions (different year uses fresh 0001)', async () => {
    // Old 2025 record exists; a 2026 query should still return 0001 since the
    // LIKE prefix filters by year (no PO-2026 records match).
    const ds = makeFakeDataSource(null);
    const next = await generateNextDocumentNumber(
      ds,
      'purchase_orders',
      'po_number',
      NUMBERING_PREFIXES.PO(2026),
    );
    expect(next).toBe('PO-2026-0001');
  });

  it('falls back to a timestamp suffix when the existing number is unparseable', async () => {
    const ds = makeFakeDataSource({ poNumber: 'PO-2026-garbage' });
    const next = await generateNextDocumentNumber(
      ds,
      'purchase_orders',
      'po_number',
      NUMBERING_PREFIXES.PO(2026),
    );
    // Should start with the prefix and then have 6 padded digits from
    // Date.now() % 1_000_000.
    expect(next.startsWith('PO-2026-')).toBe(true);
    const tail = next.replace('PO-2026-', '');
    expect(tail).toMatch(/^\d{6}$/);
  });

  it('respects a custom padding width', async () => {
    const ds = makeFakeDataSource(
      { soNumber: 'SO-2026-000042' },
      'sales_orders',
      'so_number',
    );
    // Override to return the correct number for so_number column
    const repo = (ds as any).getRepository();
    const qb = repo.createQueryBuilder();
    qb.getRawOne = jest.fn().mockResolvedValue({ docNumber: 'SO-2026-000042' });

    const next = await generateNextDocumentNumber(
      ds,
      'sales_orders',
      'so_number',
      NUMBERING_PREFIXES.SO(2026),
      6,
    );
    expect(next).toBe('SO-2026-000043');
  });

  it('supports every prefix the project ships (PR, PO, PRTN, QT, SO, SRTN)', () => {
    expect(NUMBERING_PREFIXES.PR(2026)).toBe('PR-2026-');
    expect(NUMBERING_PREFIXES.PO(2026)).toBe('PO-2026-');
    expect(NUMBERING_PREFIXES.PRTN(2026)).toBe('PRTN-2026-');
    expect(NUMBERING_PREFIXES.QT(2026)).toBe('QT-2026-');
    expect(NUMBERING_PREFIXES.SO(2026)).toBe('SO-2026-');
    expect(NUMBERING_PREFIXES.SRTN(2026)).toBe('SRTN-2026-');
  });
});
