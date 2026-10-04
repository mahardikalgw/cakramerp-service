import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const salesInvoiceLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT inv.invoice_number, inv.issue_date AS invoice_date, inv.due_date,
            inv.status, inv.amount AS total_amount,
            COALESCE(inv.paid_amount, 0) AS paid_amount,
            c.name AS customer_name, c.address AS customer_address,
            COALESCE(il.description, '') AS line_description,
            COALESCE(il.quantity, 0) AS quantity,
            COALESCE(il.unit_price, 0) AS unit_price,
            COALESCE(il.amount, 0) AS line_total
       FROM ar_invoices inv
       LEFT JOIN customers c ON c.id = inv.customer_id
       LEFT JOIN ar_invoice_lines il ON il.invoice_id = inv.id
      WHERE inv.id = CAST($1 AS uuid)
      ORDER BY il.id`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      invoiceNumber: first.invoice_number,
      invoiceDate: first.invoice_date,
      dueDate: first.due_date,
      status: first.status,
      totalAmount: first.total_amount,
      paidAmount: first.paid_amount,
      customerName: first.customer_name,
      customerAddress: first.customer_address,
    },
    lines: rows.map((r: any) => ({
      lineDescription: r.line_description,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      lineTotal: r.line_total,
    })),
  };
};
