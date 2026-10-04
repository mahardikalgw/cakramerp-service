import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const purchaseRequestLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT pr.pr_number, pr.request_date, pr.status, pr.priority,
            pr.total_amount, pr.grand_total, pr.notes,
            e.full_name AS requested_by_name, pr.department_name,
            ROW_NUMBER() OVER (ORDER BY prl.created_at) AS line_number,
            prl.item_name, prl.description, prl.quantity, prl.uom, prl.unit_cost
       FROM purchase_requests pr
       LEFT JOIN employees e ON e.id::text = pr.requested_by
       LEFT JOIN purchase_request_lines prl ON prl.purchase_request_id = pr.id
      WHERE pr.id = CAST($1 AS uuid)
      ORDER BY prl.created_at`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      prNumber: first.pr_number,
      requestDate: first.request_date,
      status: first.status,
      priority: first.priority,
      totalAmount: first.total_amount,
      grandTotal: first.grand_total,
      notes: first.notes,
      requestedByName: first.requested_by_name,
      departmentName: first.department_name,
    },
    lines: rows.map((r: any) => ({
      lineNumber: r.line_number,
      itemName: r.item_name,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      unitCost: r.unit_cost,
    })),
  };
};
