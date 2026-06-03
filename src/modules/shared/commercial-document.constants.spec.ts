import {
  LINE_TYPES,
  FULFILLMENT_STATUSES,
  PURCHASING_DOCUMENT_STATUSES,
  SALES_DOCUMENT_STATUSES,
  SOURCE_TYPES,
  GL_EVENTS,
} from './commercial-document.constants';

/**
 * Smoke tests for the central constant table. The purpose is to lock the
 * shape so a future rename or removal breaks the test loud and clear
 * rather than silently propagating through adapters and UI badges.
 */
describe('commercial-document constants', () => {
  it('exposes exactly two line types: goods and service', () => {
    expect([...LINE_TYPES]).toEqual(['goods', 'service']);
  });

  it('exposes the full fulfillment status ladder', () => {
    expect(FULFILLMENT_STATUSES).toContain('pending');
    expect(FULFILLMENT_STATUSES).toContain('partial');
    expect(FULFILLMENT_STATUSES).toContain('fulfilled');
    expect(FULFILLMENT_STATUSES).toContain('returned');
    expect(FULFILLMENT_STATUSES).toContain('cancelled');
  });

  it('exposes the purchasing header status ladder including partially_received / fully_received / invoiced', () => {
    expect(PURCHASING_DOCUMENT_STATUSES).toContain('draft');
    expect(PURCHASING_DOCUMENT_STATUSES).toContain('approved');
    expect(PURCHASING_DOCUMENT_STATUSES).toContain('partially_received');
    expect(PURCHASING_DOCUMENT_STATUSES).toContain('fully_received');
    expect(PURCHASING_DOCUMENT_STATUSES).toContain('invoiced');
  });

  it('exposes the sales header status ladder including partially_delivered / fully_delivered / invoiced', () => {
    expect(SALES_DOCUMENT_STATUSES).toContain('draft');
    expect(SALES_DOCUMENT_STATUSES).toContain('approved');
    expect(SALES_DOCUMENT_STATUSES).toContain('partially_delivered');
    expect(SALES_DOCUMENT_STATUSES).toContain('fully_delivered');
    expect(SALES_DOCUMENT_STATUSES).toContain('invoiced');
  });

  it('exposes a source-type identifier for every orchestration hop', () => {
    const expected = [
      'purchase_request',
      'purchase_order',
      'purchase_return',
      'goods_receipt',
      'supplier_invoice',
      'supplier_payment',
      'quotation',
      'sales_order',
      'sales_return',
      'stock_issuance',
      'sales_invoice',
      'customer_payment',
    ];
    for (const k of expected) {
      expect(Object.values(SOURCE_TYPES)).toContain(k);
    }
  });

  it('exposes the GL event names used by adapters', () => {
    expect(GL_EVENTS.PO_APPROVED).toBe('po_approved');
    expect(GL_EVENTS.PR_RETURNED).toBe('purchase_return_approved');
    expect(GL_EVENTS.SO_APPROVED).toBe('so_approved');
    expect(GL_EVENTS.SALES_RETURN_APPROVED).toBe('sales_return_approved');
  });
});
