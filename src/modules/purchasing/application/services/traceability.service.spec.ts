import { NotFoundException } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';

/**
 * Unit tests for the purchasing-side traceability service. The service
 * walks `document_links` (added by the 20250603 migration) and surfaces
 * the root document plus every link. The test mocks the DataSource to
 * return canned link rows and exercises both the happy path and the
 * "root not found" path.
 */

function makeService(opts: { root?: any; links?: any[]; rootType?: string }) {
  const root = opts.root ?? null;
  const links = opts.links ?? [];
  const rootType = opts.rootType ?? 'purchase_order';
  const dataSource: any = {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM document_links')) return links;
      // The traceability service issues one of several `SELECT ... FROM <table>`
      // queries for the root node. We route by the expected sourceType.
      if (
        sql.includes('FROM purchase_orders') &&
        rootType === 'purchase_order'
      ) {
        return root ? [root] : [];
      }
      if (
        sql.includes('FROM purchase_requests') &&
        rootType === 'purchase_request'
      ) {
        return root ? [root] : [];
      }
      if (
        sql.includes('FROM purchase_returns') &&
        rootType === 'purchase_return'
      ) {
        return root ? [root] : [];
      }
      if (sql.includes('FROM goods_receipts') && rootType === 'goods_receipt') {
        return root ? [root] : [];
      }
      if (sql.includes('FROM ap_invoices') && rootType === 'supplier_invoice') {
        return root ? [root] : [];
      }
      if (sql.includes('FROM ap_payments') && rootType === 'supplier_payment') {
        return root ? [root] : [];
      }
      return [];
    }),
  };
  const svc = new TraceabilityService(dataSource);
  return { svc, dataSource };
}

describe('TraceabilityService.getChain', () => {
  it('throws NotFoundException when the root cannot be located', async () => {
    const { svc } = makeService({});
    await expect(
      svc.getChain('purchase_order', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the root plus an empty links array when no document_links exist', async () => {
    const { svc } = makeService({
      root: {
        id: 'po-1',
        number: 'PO-2026-0001',
        amount: 1000,
        status: 'approved',
        date: '2026-06-01',
      },
      links: [],
      rootType: 'purchase_order',
    });
    const result = await svc.getChain('purchase_order', 'po-1');
    expect(result.root.type).toBe('purchase_order');
    expect(result.root.number).toBe('PO-2026-0001');
    expect(result.links).toEqual([]);
  });

  it('decorates every link with the source and target numbers', async () => {
    // For this test we need to mock multiple document types for fetchNumber calls
    const documents: Record<string, any> = {
      'purchase_order:po-1': {
        id: 'po-1',
        number: 'PO-2026-0001',
        amount: 1000,
        status: 'approved',
        date: '2026-06-01',
      },
      'goods_receipt:grn-1': {
        id: 'grn-1',
        number: 'GRN-2026-0001',
        amount: 0,
        status: 'confirmed',
        date: '2026-06-03',
      },
      'supplier_invoice:ap-1': {
        id: 'ap-1',
        number: 'AP-2026-0001',
        amount: 1000,
        status: 'pending',
        date: '2026-06-04',
      },
    };

    const links = [
      {
        source_type: 'purchase_order',
        source_id: 'po-1',
        target_type: 'goods_receipt',
        target_id: 'grn-1',
        link_kind: 'orchestration',
        created_at: '2026-06-03T10:00:00Z',
      },
      {
        source_type: 'goods_receipt',
        source_id: 'grn-1',
        target_type: 'supplier_invoice',
        target_id: 'ap-1',
        link_kind: 'orchestration',
        created_at: '2026-06-04T10:00:00Z',
      },
    ];

    const dataSource: any = {
      query: jest
        .fn()
        .mockImplementation(async (sql: string, params: any[]) => {
          if (sql.includes('FROM document_links')) return links;
          // Route to the correct document based on the table and id
          if (sql.includes('FROM purchase_orders') && params?.[0] === 'po-1') {
            return [documents['purchase_order:po-1']];
          }
          if (sql.includes('FROM goods_receipts') && params?.[0] === 'grn-1') {
            return [documents['goods_receipt:grn-1']];
          }
          if (sql.includes('FROM ap_invoices') && params?.[0] === 'ap-1') {
            return [documents['supplier_invoice:ap-1']];
          }
          return [];
        }),
    };

    const svc = new TraceabilityService(dataSource);
    const result = await svc.getChain('purchase_order', 'po-1');
    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toMatchObject({
      targetType: 'goods_receipt',
      targetNumber: 'GRN-2026-0001',
    });
    expect(result.links[1]).toMatchObject({
      targetType: 'supplier_invoice',
      targetNumber: 'AP-2026-0001',
    });
  });
});
