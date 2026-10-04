import type { SqlViewLoader } from '../domain/ports/document-data-source.port';

export const goodsReceiptLoader: SqlViewLoader = async (ds, entityId) => {
  const rows = await ds.query(
    `SELECT gr.grn_number AS receipt_number, gr.received_date AS receipt_date,
            gr.status, gr.notes,
            po.order_number AS po_number,
            COALESCE(s.name, gr.vendor_name) AS supplier_name,
            ROW_NUMBER() OVER (ORDER BY grl.created_at) AS line_number,
            grl.item_name, grl.received_qty AS quantity_received,
            grl.uom, grl.remarks AS condition_notes
       FROM goods_receipts gr
       LEFT JOIN purchase_orders po ON po.id = gr.po_id
       LEFT JOIN suppliers s ON s.id = gr.supplier_id
       LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id
      WHERE gr.id = CAST($1 AS uuid)
      ORDER BY grl.created_at`,
    [entityId],
  );
  const first = rows[0] ?? {};
  return {
    parameters: {
      receiptNumber: first.receipt_number,
      receiptDate: first.receipt_date,
      status: first.status,
      notes: first.notes,
      poNumber: first.po_number,
      supplierName: first.supplier_name,
    },
    lines: rows.map((r: any) => ({
      lineNumber: r.line_number,
      itemName: r.item_name,
      quantityReceived: r.quantity_received,
      uom: r.uom,
      conditionNotes: r.condition_notes,
    })),
  };
};
