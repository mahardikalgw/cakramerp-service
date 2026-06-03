import { BadRequestException } from '@nestjs/common';
import { ProcurementWarehouseAdapter } from './procurement-warehouse.adapter';

/**
 * Unit tests for the procurement → warehouse adapter. The adapter is the
 * single point where the "service lines skip warehouse" rule is enforced
 * for the purchasing module, so it deserves thorough coverage:
 *
 *   1. Service-only POs throw (no goods → no GRN).
 *   2. Mixed POs only forward goods lines, with the right remaining
 *      quantities.
 *   3. Fully-received lines are dropped from the next GRN.
 *   4. All-goods POs forward every line.
 */

interface FakePoLine {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  received_quantity: number;
  uom: string;
  unit_cost: number;
  line_type: 'goods' | 'service';
  purchase_order_id?: string;
}

function makeAdapter(opts: {
  po?: {
    id: string;
    po_number: string;
    supplier_id: string;
    supplier_name: string;
  } | null;
  poLines?: FakePoLine[];
  grnResult?:
    | { receipt: { id: string; grnNumber: string } }
    | { id: string; grnNumber: string };
}) {
  const po = opts.po ?? {
    id: 'po-1',
    po_number: 'PO-2026-0001',
    supplier_id: 'sup-1',
    supplier_name: 'Acme Supplies',
  };
  const poLines = opts.poLines ?? [];

  // Build a DataSource whose `query` returns a different result depending on
  // whether the query targets `purchase_orders` (the header) or
  // `purchase_order_lines` (the lines).
  const dataSource: any = {
    query: jest
      .fn()
      .mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes('FROM purchase_orders')) {
          return po ? [po] : [];
        }
        if (sql.includes('FROM purchase_order_lines')) {
          if (sql.includes("line_type = 'goods'")) {
            return poLines.filter((l) => l.line_type === 'goods');
          }
          return poLines.filter(
            (l) => l.purchase_order_id === params[0] || true,
          );
        }
        return [];
      }),
  };

  // Build a fake goods receipt service that captures its input.
  const goodsReceiptCalls: any[] = [];
  const goodsReceiptService: any = {
    create: jest.fn().mockImplementation(async (dto: any) => {
      goodsReceiptCalls.push(dto);
      return (
        opts.grnResult ?? {
          receipt: { id: 'grn-1', grnNumber: 'GRN-2026-0001' },
        }
      );
    }),
  };

  const adapter: any = new ProcurementWarehouseAdapter(
    goodsReceiptService,
    dataSource,
  );
  // Allow tests to assert on internals if needed.
  adapter._goodsReceiptCalls = goodsReceiptCalls;
  return { adapter, dataSource, goodsReceiptService, goodsReceiptCalls };
}

describe('ProcurementWarehouseAdapter', () => {
  it('throws when a service-only PO tries to receive goods', async () => {
    const { adapter } = makeAdapter({
      poLines: [
        {
          id: 'l1',
          item_id: 'svc-a',
          item_name: 'Consulting',
          quantity: 1,
          received_quantity: 0,
          uom: 'svc',
          unit_cost: 1000,
          line_type: 'service',
        },
      ],
    });

    await expect(
      adapter.createDraftGoodsReceiptFromPO('po-1', 'user-1', 'wh-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when all goods lines have already been fully received', async () => {
    const { adapter } = makeAdapter({
      poLines: [
        {
          id: 'l1',
          item_id: 'item-1',
          item_name: 'Widget',
          quantity: 10,
          received_quantity: 10,
          uom: 'pcs',
          unit_cost: 5,
          line_type: 'goods',
        },
      ],
    });

    await expect(
      adapter.createDraftGoodsReceiptFromPO('po-1', 'user-1', 'wh-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the PO id does not exist', async () => {
    const { adapter } = makeAdapter({ po: null, poLines: [] });
    await expect(
      adapter.createDraftGoodsReceiptFromPO('missing', 'user-1', 'wh-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forwards only goods lines and strips service lines', async () => {
    const { adapter, goodsReceiptCalls } = makeAdapter({
      poLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Widget',
          quantity: 10,
          received_quantity: 0,
          uom: 'pcs',
          unit_cost: 5,
          line_type: 'goods',
        },
        {
          id: 's1',
          item_id: 'svc-1',
          item_name: 'Install',
          quantity: 1,
          received_quantity: 0,
          uom: 'svc',
          unit_cost: 200,
          line_type: 'service',
        },
      ],
    });

    const result = await adapter.createDraftGoodsReceiptFromPO(
      'po-1',
      'user-1',
      'wh-1',
    );

    expect(goodsReceiptCalls).toHaveLength(1);
    const dto = goodsReceiptCalls[0];
    expect(dto.poId).toBe('po-1');
    expect(dto.warehouseId).toBe('wh-1');
    expect(dto.vendorName).toBe('Acme Supplies');
    // Only the goods line survives the filter.
    expect(dto.lines).toHaveLength(1);
    expect(dto.lines[0]).toMatchObject({
      itemId: 'item-1',
      poQty: 10,
      receivedQty: 10,
      uom: 'pcs',
    });

    expect(result.goodsReceiptId).toBe('grn-1');
    expect(result.goodsReceiptNumber).toBe('GRN-2026-0001');
  });

  it('respects partial fulfillment (5 of 10 already received → 5 in next GRN)', async () => {
    const { adapter, goodsReceiptCalls } = makeAdapter({
      poLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Widget',
          quantity: 10,
          received_quantity: 5,
          uom: 'pcs',
          unit_cost: 5,
          line_type: 'goods',
        },
      ],
    });

    await adapter.createDraftGoodsReceiptFromPO('po-1', 'user-1', 'wh-1');

    expect(goodsReceiptCalls[0].lines[0].receivedQty).toBe(5);
  });

  it('honours per-line override quantities', async () => {
    const { adapter, goodsReceiptCalls } = makeAdapter({
      poLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Widget',
          quantity: 10,
          received_quantity: 0,
          uom: 'pcs',
          unit_cost: 5,
          line_type: 'goods',
        },
      ],
    });

    await adapter.createDraftGoodsReceiptFromPO('po-1', 'user-1', 'wh-1', {
      itemReceivedQty: { g1: 3 },
    });

    expect(goodsReceiptCalls[0].lines[0].receivedQty).toBe(3);
  });

  it('returns the goods-receipt id and number from the warehouse service', async () => {
    const { adapter } = makeAdapter({
      poLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Widget',
          quantity: 10,
          received_quantity: 0,
          uom: 'pcs',
          unit_cost: 5,
          line_type: 'goods',
        },
      ],
      grnResult: { id: 'grn-99', grnNumber: 'GRN-2026-0099' },
    });

    const result = await adapter.createDraftGoodsReceiptFromPO(
      'po-1',
      'user-1',
      'wh-1',
    );
    expect(result.goodsReceiptId).toBe('grn-99');
    expect(result.goodsReceiptNumber).toBe('GRN-2026-0099');
  });
});
