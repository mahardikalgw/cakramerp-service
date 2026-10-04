import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const journalEntryLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT je.entry_number, je.date AS entry_date, je.status, je.description,
            ROW_NUMBER() OVER (ORDER BY jel.created_at) AS line_number,
            a.code AS account_code, a.name AS account_name,
            jel.debit, jel.credit, jel.description AS line_description
       FROM journal_entries je
       LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       LEFT JOIN accounts a ON a.id = jel.account_id
      WHERE je.id = CAST($1 AS uuid)
      ORDER BY jel.created_at`,
    [entityId],
  );
  const first = rows[0] ?? {};
  const totalDebit = rows.reduce(
    (sum: number, r: any) => sum + Number(r.debit ?? 0),
    0,
  );
  const totalCredit = rows.reduce(
    (sum: number, r: any) => sum + Number(r.credit ?? 0),
    0,
  );
  return {
    parameters: {
      entryNumber: first.entry_number,
      entryDate: first.entry_date,
      status: first.status,
      description: first.description,
      totalDebit,
      totalCredit,
    },
    lines: rows.map((r: any) => ({
      lineNumber: r.line_number,
      accountCode: r.account_code,
      accountName: r.account_name,
      debit: r.debit,
      credit: r.credit,
      lineDescription: r.line_description,
    })),
  };
};
