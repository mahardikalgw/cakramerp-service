import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GOODS_RECEIPT_SERVICE } from '../../../warehouse/application/ports/goods-receipt-service.port';
import type { GoodsReceiptServicePort } from '../../../warehouse/application/ports/goods-receipt-service.port';
import { SOURCE_TYPES } from '../../../shared/commercial-document.constants';

/**
 * Procurement → Warehouse adapter.
 *
 * Purchasing owns the PO document; warehouse owns stock. This adapter is the
 * only place purchasing talks to warehouse. Service lines on the PO are
 * filtered out before any warehouse call so the adapter automatically
 * respects the "service lines skip warehouse" rule.
 */
@Injectable()
export class ProcurementWarehouseAdapter {
  constructor(
    @Inject(GOODS_RECEIPT_SERVICE)
    private readonly goodsReceiptService: GoodsReceiptServicePort,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Builds a draft GRN (confirmed) from a PO, including only goods lines.
   * Returns the goods receipt id and persists a `document_links` row so the
   * full chain can be queried later.
   */
  async createDraftGoodsReceiptFromPO(
    poId: string,
    userId: string,
    warehouseId: string,
    overrides?: { itemReceivedQty?: Record<string, number> },
  ): Promise<{ goodsReceiptId: string; goodsReceiptNumber: string }> {
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required to receive goods');
    }

    const po = await this.dataSource.query(
      `SELECT id, po_number, supplier_id, supplier_name
       FROM purchase_orders WHERE id = $1 LIMIT 1`,
      [poId],
    );
    if (po.length === 0)
      throw new BadRequestException('Purchase order not found');

    const poLines: any[] = await this.dataSource.query(
      `SELECT id, item_id, item_name, quantity, received_quantity, uom, unit_cost, line_type
       FROM purchase_order_lines
       WHERE purchase_order_id = $1 AND line_type = 'goods'
       ORDER BY id ASC`,
      [poId],
    );

    if (poLines.length === 0) {
      throw new BadRequestException(
        'No goods lines on this purchase order (service-only PO does not require a goods receipt)',
      );
    }

    const lines = poLines
      .map((l) => {
        const remaining = Number(l.quantity) - Number(l.received_quantity ?? 0);
        if (remaining <= 0) return null;
        const received = overrides?.itemReceivedQty?.[l.id] ?? remaining;
        return {
          itemId: l.item_id,
          itemName: l.item_name,
          poQty: Number(l.quantity),
          receivedQty: received,
          uom: l.uom ?? 'pcs',
          unitCost: Number(l.unit_cost),
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (lines.length === 0) {
      throw new BadRequestException(
        'No open goods lines remain to be received (already fully received)',
      );
    }

    const result = await this.goodsReceiptService.create(
      {
        poId,
        warehouseId,
        supplierId: po[0].supplier_id,
        vendorName: po[0].supplier_name,
        receivedDate: new Date().toISOString(),
        lines,
      },
      userId,
    );

    const goodsReceiptId = result?.receipt?.id ?? result?.id;
    const goodsReceiptNumber = result?.receipt?.grnNumber ?? result?.grnNumber;

    await this.recordLink(
      SOURCE_TYPES.PURCHASE_ORDER,
      poId,
      SOURCE_TYPES.GOODS_RECEIPT,
      goodsReceiptId,
    );

    await this.updatePOLineFulfillment(poId);

    return { goodsReceiptId, goodsReceiptNumber };
  }

  /**
   * Recomputes `received_quantity` and `fulfillment_status` for each PO line
   * based on actual GRN lines. Header status moves to `partially_received` or
   * `fully_received` accordingly.
   */
  async updatePOLineFulfillment(poId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE purchase_order_lines pol
       SET received_quantity = COALESCE((
         SELECT SUM(grl.received_qty)
         FROM goods_receipt_lines grl
         JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
         WHERE gr.po_id = pol.purchase_order_id
         AND grl.item_id = pol.item_id
       ), 0),
       fulfillment_status = CASE
         WHEN COALESCE((
           SELECT SUM(grl.received_qty)
           FROM goods_receipt_lines grl
           JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
           WHERE gr.po_id = pol.purchase_order_id
           AND grl.item_id = pol.item_id
         ), 0) = 0 THEN 'pending'
         WHEN COALESCE((
           SELECT SUM(grl.received_qty)
           FROM goods_receipt_lines grl
           JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
           WHERE gr.po_id = pol.purchase_order_id
           AND grl.item_id = pol.item_id
         ), 0) >= pol.quantity THEN 'fulfilled'
         ELSE 'partial'
       END,
       updated_at = NOW()
       WHERE pol.purchase_order_id = $1`,
      [poId],
    );

    await this.dataSource.query(
      `UPDATE purchase_orders po
       SET status = CASE
         WHEN (
           SELECT COUNT(*) FROM purchase_order_lines
           WHERE purchase_order_id = po.id AND line_type = 'goods' AND fulfillment_status <> 'fulfilled'
         ) = 0 AND EXISTS (
           SELECT 1 FROM purchase_order_lines WHERE purchase_order_id = po.id AND line_type = 'goods'
         ) THEN 'fully_received'
         WHEN (
           SELECT COUNT(*) FROM purchase_order_lines
           WHERE purchase_order_id = po.id AND line_type = 'goods' AND fulfillment_status = 'partial'
         ) > 0 THEN 'partially_received'
         ELSE status
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [poId],
    );
  }

  private async recordLink(
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO document_links (source_type, source_id, target_type, target_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [sourceType, sourceId, targetType, targetId],
    );
  }
}
