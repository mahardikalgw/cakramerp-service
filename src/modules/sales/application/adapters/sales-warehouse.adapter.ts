import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { STOCK_ISSUANCE_SERVICE } from '../../../warehouse/application/ports/stock-issuance-service.port';
import type { StockIssuanceServicePort } from '../../../warehouse/application/ports/stock-issuance-service.port';
import { SOURCE_TYPES } from '../../../shared/commercial-document.constants';

/**
 * Sales → Warehouse adapter.
 *
 * Sales owns the SO document; warehouse owns stock issuance. This adapter is
 * the only place sales talks to warehouse. Service lines on the SO are
 * filtered out before any warehouse call so the adapter automatically
 * respects the "service lines skip warehouse" rule.
 */
@Injectable()
export class SalesWarehouseAdapter {
  constructor(
    @Inject(STOCK_ISSUANCE_SERVICE)
    private readonly stockIssuanceService: StockIssuanceServicePort,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Build a stock issuance from a sales order, including only goods lines.
   * Service lines are filtered out at the SQL layer.
   */
  async createDraftIssuanceFromSO(
    soId: string,
    userId: string,
    warehouseId: string,
    destinationType = 'customer',
    overrides?: { itemIssuedQty?: Record<string, number> },
  ): Promise<{ issuanceId: string }> {
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required to issue goods');
    }

    const so: any[] = await this.dataSource.query(
      `SELECT id, so_number, customer_id, customer_name
       FROM sales_orders WHERE id = $1 LIMIT 1`,
      [soId],
    );
    if (so.length === 0) throw new BadRequestException('Sales order not found');

    const soLines: any[] = await this.dataSource.query(
      `SELECT id, item_id, item_name, quantity, delivered_quantity, uom, unit_price, line_type
       FROM sales_order_lines
       WHERE sales_order_id = $1 AND line_type = 'goods'
       ORDER BY id ASC`,
      [soId],
    );

    if (soLines.length === 0) {
      throw new BadRequestException(
        'No goods lines on this sales order (service-only SO does not require a stock issuance)',
      );
    }

    const lines = soLines
      .map((l) => {
        const remaining =
          Number(l.quantity) - Number(l.delivered_quantity ?? 0);
        if (remaining <= 0) return null;
        const issued = overrides?.itemIssuedQty?.[l.id] ?? remaining;
        return {
          itemId: l.item_id,
          itemName: l.item_name,
          requestedQty: Number(l.quantity),
          issuedQty: issued,
          uom: l.uom ?? 'pcs',
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (lines.length === 0) {
      throw new BadRequestException(
        'No open goods lines remain to be issued (already fully delivered)',
      );
    }

    const result = await this.stockIssuanceService.create(
      {
        soId,
        warehouseId,
        destinationType,
        destinationRefId: so[0].customer_id,
        destinationRefName: so[0].customer_name,
        issuedDate: new Date().toISOString(),
        lines,
        notes: `From SO ${so[0].so_number}`,
      },
      userId,
    );

    const issuanceId = result?.id ?? result?.issuance?.id;
    await this.recordLink(
      SOURCE_TYPES.SALES_ORDER,
      soId,
      SOURCE_TYPES.STOCK_ISSUANCE,
      issuanceId,
    );

    await this.updateSOLineFulfillment(soId);

    return { issuanceId };
  }

  /**
   * Recomputes `delivered_quantity` and `fulfillment_status` for each SO
   * line based on actual issuance lines. Header status moves to
   * `partially_delivered` or `fully_delivered` accordingly.
   */
  async updateSOLineFulfillment(soId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE sales_order_lines sol
       SET delivered_quantity = COALESCE((
         SELECT SUM(sil.issued_qty)
         FROM stock_issuance_lines sil
         JOIN stock_issuances si ON si.id = sil.issuance_id
         WHERE si.so_id = sol.sales_order_id
         AND sil.item_id = sol.item_id
       ), 0),
       fulfillment_status = CASE
         WHEN COALESCE((
           SELECT SUM(sil.issued_qty)
           FROM stock_issuance_lines sil
           JOIN stock_issuances si ON si.id = sil.issuance_id
           WHERE si.so_id = sol.sales_order_id
           AND sil.item_id = sol.item_id
         ), 0) = 0 THEN 'pending'
         WHEN COALESCE((
           SELECT SUM(sil.issued_qty)
           FROM stock_issuance_lines sil
           JOIN stock_issuances si ON si.id = sil.issuance_id
           WHERE si.so_id = sol.sales_order_id
           AND sil.item_id = sol.item_id
         ), 0) >= sol.quantity THEN 'fulfilled'
         ELSE 'partial'
       END,
       updated_at = NOW()
       WHERE sol.sales_order_id = $1`,
      [soId],
    );

    await this.dataSource.query(
      `UPDATE sales_orders so
       SET status = CASE
         WHEN (
           SELECT COUNT(*) FROM sales_order_lines
           WHERE sales_order_id = so.id AND line_type = 'goods' AND fulfillment_status <> 'fulfilled'
         ) = 0 AND EXISTS (
           SELECT 1 FROM sales_order_lines WHERE sales_order_id = so.id AND line_type = 'goods'
         ) THEN 'fully_delivered'
         WHEN (
           SELECT COUNT(*) FROM sales_order_lines
           WHERE sales_order_id = so.id AND line_type = 'goods' AND fulfillment_status = 'partial'
         ) > 0 THEN 'partially_delivered'
         ELSE status
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [soId],
    );
  }

  /**
   * Sales return flow: builds a stock-issuance reversal. The actual reversal
   * uses the warehouse `reverse` API. Returns the new stock movement id
   * (the warehouse service creates a fresh issuance entry to capture the
   * inbound movement).
   */
  async reverseFromSalesReturn(
    salesReturnId: string,
    userId: string,
    reason: string,
  ): Promise<{ reversed: boolean }> {
    const ret: any[] = await this.dataSource.query(
      `SELECT id, return_number, sales_order_id, customer_id
       FROM sales_returns WHERE id = $1 LIMIT 1`,
      [salesReturnId],
    );
    if (ret.length === 0)
      throw new BadRequestException('Sales return not found');
    const header = ret[0];
    if (!header.sales_order_id) {
      // No SO link means there's nothing in the warehouse to reverse
      return { reversed: false };
    }

    // Find the most recent issuance for the SO and reverse it.
    const issuance: { id: string } | undefined = (
      await this.dataSource.query(
        `SELECT id FROM stock_issuances WHERE so_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [header.sales_order_id],
      )
    )[0];

    if (!issuance) {
      return { reversed: false };
    }

    await this.stockIssuanceService.reverse(
      issuance.id,
      `Sales Return ${header.return_number}: ${reason}`,
      userId,
    );

    await this.recordLink(
      SOURCE_TYPES.SALES_RETURN,
      salesReturnId,
      SOURCE_TYPES.STOCK_ISSUANCE,
      issuance.id,
    );

    await this.updateSOLineFulfillment(header.sales_order_id);

    return { reversed: true };
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
