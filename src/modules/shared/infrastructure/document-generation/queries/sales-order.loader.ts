import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const salesOrderLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT so.so_number AS order_number, so.order_date, so.status,
            so.total_amount, 'IDR' AS currency,
            c.name AS customer_name, c.address AS customer_address,
            ROW_NUMBER() OVER (ORDER BY sol.created_at) AS line_number,
            sol.item_name AS item_description, sol.quantity,
            sol.unit_price, sol.amount AS line_total
       FROM sales_orders so
       JOIN customers c ON c.id = so.customer_id
       JOIN sales_order_lines sol ON sol.sales_order_id = so.id
      WHERE so.id = CAST($1 AS uuid)
      ORDER BY sol.created_at`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      orderNumber: first.order_number,
      orderDate: first.order_date,
      status: first.status,
      totalAmount: first.total_amount,
      currency: first.currency,
      customerName: first.customer_name,
      customerAddress: first.customer_address,
    },
    lines: rows.map((r: any) => ({
      lineNumber: r.line_number,
      itemDescription: r.item_description,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      lineTotal: r.line_total,
    })),
  };
};
