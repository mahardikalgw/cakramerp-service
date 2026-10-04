import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const purchaseOrderLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT po.order_number, po.order_date, po.status, po.total_amount,
            'IDR' AS currency,
            COALESCE(s.name, po.supplier_name) AS supplier_name,
            s.address AS supplier_address,
            ROW_NUMBER() OVER (ORDER BY pol.created_at) AS line_number,
            pol.item_name AS item_description, pol.quantity,
            pol.unit_cost AS unit_price, pol.total_cost AS line_total
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      WHERE po.id = CAST($1 AS uuid)
      ORDER BY pol.created_at`,
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
      supplierName: first.supplier_name,
      supplierAddress: first.supplier_address,
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
