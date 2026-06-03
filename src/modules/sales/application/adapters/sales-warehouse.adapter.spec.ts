import { BadRequestException } from '@nestjs/common';
import { SalesWarehouseAdapter } from './sales-warehouse.adapter';

/**
 * Unit tests for the sales → warehouse adapter. Mirror of the purchasing
 * adapter test suite, but for the issuance side. The "service lines skip
 * warehouse" rule is the cornerstone of the orchestration layer.
 */

interface FakeSoLine {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  delivered_quantity: number;
  uom: string;
  unit_price: number;
  line_type: 'goods' | 'service';
}

function makeAdapter(opts: {
  so?: {
    id: string;
    so_number: string;
    customer_id: string;
    customer_name: string;
  } | null;
  soLines?: FakeSoLine[];
  issuanceResult?: any;
}) {
  const so = opts.so ?? {
    id: 'so-1',
    so_number: 'SO-2026-0001',
    customer_id: 'cus-1',
    customer_name: 'Acme Corp',
  };
  const soLines = opts.soLines ?? [];

  const dataSource: any = {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM sales_orders')) return so ? [so] : [];
      if (sql.includes('FROM sales_order_lines')) {
        if (sql.includes("line_type = 'goods'")) {
          return soLines.filter((l) => l.line_type === 'goods');
        }
        return soLines;
      }
      if (sql.includes('FROM stock_issuances')) return [];
      if (sql.includes('FROM sales_returns')) return [];
      return [];
    }),
  };

  const issuanceCalls: any[] = [];
  const stockIssuanceService: any = {
    create: jest.fn().mockImplementation(async (dto: any) => {
      issuanceCalls.push(dto);
      return opts.issuanceResult ?? { id: 'iss-1' };
    }),
    reverse: jest.fn().mockResolvedValue({ id: 'iss-1' }),
  };

  const adapter: any = new SalesWarehouseAdapter(
    stockIssuanceService,
    dataSource,
  );
  adapter._issuanceCalls = issuanceCalls;
  return { adapter, dataSource, stockIssuanceService, issuanceCalls };
}

describe('SalesWarehouseAdapter', () => {
  it('throws when a service-only SO tries to deliver', async () => {
    const { adapter } = makeAdapter({
      soLines: [
        {
          id: 'l1',
          item_id: 'svc-a',
          item_name: 'Maintenance',
          quantity: 1,
          delivered_quantity: 0,
          uom: 'svc',
          unit_price: 500,
          line_type: 'service',
        },
      ],
    });

    await expect(
      adapter.createDraftIssuanceFromSO('so-1', 'user-1', 'wh-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the SO does not exist', async () => {
    const { adapter } = makeAdapter({ so: null, soLines: [] });
    await expect(
      adapter.createDraftIssuanceFromSO('missing', 'user-1', 'wh-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('strips service lines and forwards only goods lines to issuance', async () => {
    const { adapter, issuanceCalls } = makeAdapter({
      soLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Gadget',
          quantity: 4,
          delivered_quantity: 0,
          uom: 'pcs',
          unit_price: 25,
          line_type: 'goods',
        },
        {
          id: 's1',
          item_id: 'svc-1',
          item_name: 'Install',
          quantity: 1,
          delivered_quantity: 0,
          uom: 'svc',
          unit_price: 200,
          line_type: 'service',
        },
      ],
    });

    const result = await adapter.createDraftIssuanceFromSO(
      'so-1',
      'user-1',
      'wh-1',
    );

    expect(issuanceCalls).toHaveLength(1);
    const dto = issuanceCalls[0];
    expect(dto.soId).toBe('so-1');
    expect(dto.warehouseId).toBe('wh-1');
    expect(dto.destinationType).toBe('customer');
    expect(dto.destinationRefId).toBe('cus-1');
    expect(dto.destinationRefName).toBe('Acme Corp');
    expect(dto.lines).toHaveLength(1);
    expect(dto.lines[0]).toMatchObject({
      itemId: 'item-1',
      requestedQty: 4,
      issuedQty: 4,
    });

    expect(result.issuanceId).toBe('iss-1');
  });

  it('respects partial delivery (3 of 5 already delivered → 2 in next issuance)', async () => {
    const { adapter, issuanceCalls } = makeAdapter({
      soLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Gadget',
          quantity: 5,
          delivered_quantity: 3,
          uom: 'pcs',
          unit_price: 10,
          line_type: 'goods',
        },
      ],
    });

    await adapter.createDraftIssuanceFromSO('so-1', 'user-1', 'wh-1');
    expect(issuanceCalls[0].lines[0].issuedQty).toBe(2);
  });

  it('returns the issuance id from the warehouse service', async () => {
    const { adapter } = makeAdapter({
      soLines: [
        {
          id: 'g1',
          item_id: 'item-1',
          item_name: 'Gadget',
          quantity: 1,
          delivered_quantity: 0,
          uom: 'pcs',
          unit_price: 1,
          line_type: 'goods',
        },
      ],
      issuanceResult: { id: 'iss-42' },
    });

    const result = await adapter.createDraftIssuanceFromSO(
      'so-1',
      'user-1',
      'wh-1',
    );
    expect(result.issuanceId).toBe('iss-42');
  });
});
