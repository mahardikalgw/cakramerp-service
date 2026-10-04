import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const purchaseReturnLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT prtn.return_number, prtn.return_date, prtn.status,
            prtn.total_amount, prtn.reason, prtn.supplier_name,
            prnl.item_name, prnl.quantity, prnl.uom, prnl.unit_cost
       FROM purchase_returns prtn
       LEFT JOIN purchase_return_lines prnl
              ON prnl.purchase_return_id = prtn.id
      WHERE prtn.id = CAST($1 AS uuid)
      ORDER BY prnl.id`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      returnNumber: first.return_number,
      returnDate: first.return_date,
      status: first.status,
      totalAmount: first.total_amount,
      reason: first.reason,
      supplierName: first.supplier_name,
    },
    lines: rows.map((r: any, i: number) => ({
      lineNumber: i + 1,
      itemName: r.item_name,
      quantity: r.quantity,
      uom: r.uom,
      unitCost: r.unit_cost,
      lineTotal: Number(r.quantity ?? 0) * Number(r.unit_cost ?? 0),
    })),
  };
};
