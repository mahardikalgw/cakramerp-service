import { NotFoundException } from '@nestjs/common';
import { SalesTraceabilityService } from './sales-traceability.service';

/**
 * Mirror of the purchasing-side traceability tests for sales. The same
 * DataSource routing pattern but with the sales tables.
 */

function makeService(opts: { root?: any; links?: any[]; rootType?: string }) {
  const root = opts.root ?? null;
  const links = opts.links ?? [];
  const rootType = opts.rootType ?? 'sales_order';
  const dataSource: any = {
    query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM document_links')) return links;
      if (sql.includes('FROM sales_orders') && rootType === 'sales_order') {
        return root ? [root] : [];
      }
      if (sql.includes('FROM quotations') && rootType === 'quotation') {
        return root ? [root] : [];
      }
      if (sql.includes('FROM sales_returns') && rootType === 'sales_return') {
        return root ? [root] : [];
      }
      if (
        sql.includes('FROM stock_issuances') &&
        rootType === 'stock_issuance'
      ) {
        return root ? [root] : [];
      }
      if (sql.includes('FROM ar_invoices') && rootType === 'sales_invoice') {
        return root ? [root] : [];
      }
      if (sql.includes('FROM ar_payments') && rootType === 'customer_payment') {
        return root ? [root] : [];
      }
      return [];
    }),
  };
  const svc = new SalesTraceabilityService(dataSource);
  return { svc, dataSource };
}

describe('SalesTraceabilityService.getChain', () => {
  it('throws NotFoundException when the root is missing', async () => {
    const { svc } = makeService({});
    await expect(svc.getChain('sales_order', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the sales chain with stock_issuance and sales_invoice links', async () => {
    // For this test we need to mock multiple document types for fetchNumber calls
    const documents: Record<string, any> = {
      'sales_order:so-1': {
        id: 'so-1',
        number: 'SO-2026-0001',
        amount: 500,
        status: 'invoiced',
        date: '2026-06-01',
      },
      'stock_issuance:iss-1': {
        id: 'iss-1',
        number: 'ISS-2026-0001',
        amount: 0,
        status: 'confirmed',
        date: '2026-06-03',
      },
      'sales_invoice:ar-1': {
        id: 'ar-1',
        number: 'AR-2026-0001',
        amount: 500,
        status: 'pending',
        date: '2026-06-03',
      },
    };

    const links = [
      {
        source_type: 'sales_order',
        source_id: 'so-1',
        target_type: 'stock_issuance',
        target_id: 'iss-1',
        link_kind: 'orchestration',
        created_at: '2026-06-03T11:00:00Z',
      },
      {
        source_type: 'sales_order',
        source_id: 'so-1',
        target_type: 'sales_invoice',
        target_id: 'ar-1',
        link_kind: 'orchestration',
        created_at: '2026-06-03T12:00:00Z',
      },
    ];

    const dataSource: any = {
      query: jest
        .fn()
        .mockImplementation(async (sql: string, params: any[]) => {
          if (sql.includes('FROM document_links')) return links;
          // Route to the correct document based on the table and id
          if (sql.includes('FROM sales_orders') && params?.[0] === 'so-1') {
            return [documents['sales_order:so-1']];
          }
          if (sql.includes('FROM stock_issuances') && params?.[0] === 'iss-1') {
            return [documents['stock_issuance:iss-1']];
          }
          if (sql.includes('FROM ar_invoices') && params?.[0] === 'ar-1') {
            return [documents['sales_invoice:ar-1']];
          }
          return [];
        }),
    };

    const svc = new SalesTraceabilityService(dataSource);
    const result = await svc.getChain('sales_order', 'so-1');
    expect(result.links).toHaveLength(2);
    expect(result.links.map((l) => l.targetType).sort()).toEqual([
      'sales_invoice',
      'stock_issuance',
    ]);
  });
});
