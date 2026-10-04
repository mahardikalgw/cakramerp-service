import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const quotationLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT q.quotation_number, q.quotation_date, q.valid_until, q.status,
            q.total_amount, q.tax_amount, q.grand_total,
            COALESCE(c.name, q.customer_name) AS customer_name,
            c.address AS customer_address,
            ROW_NUMBER() OVER (ORDER BY ql.created_at) AS line_number,
            ql.item_name, ql.description, ql.quantity,
            ql.uom, ql.unit_price, ql.amount
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       LEFT JOIN quotation_lines ql ON ql.quotation_id = q.id
      WHERE q.id = CAST($1 AS uuid)
      ORDER BY ql.created_at`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      quotationNumber: first.quotation_number,
      quotationDate: first.quotation_date,
      validUntil: first.valid_until,
      status: first.status,
      totalAmount: first.total_amount,
      taxAmount: first.tax_amount,
      grandTotal: first.grand_total,
      customerName: first.customer_name,
      customerAddress: first.customer_address,
    },
    lines: rows.map((r: any) => ({
      lineNumber: r.line_number,
      itemName: r.item_name,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      unitPrice: r.unit_price,
      amount: r.amount,
    })),
  };
};
