/**
 * Shared commercial-document constants
 *
 * Both purchasing and sales modules reuse these enums / type names / source
 * identifiers so that traceability, GL queue entries, and orchestration calls
 * speak a common vocabulary.
 *
 * Adding a new document kind: add the sourceType string here, and (if needed)
 * the line/header status enums. Never duplicate these as ad-hoc string
 * literals in service code.
 */

export const LINE_TYPES = ['goods', 'service'] as const;
export type LineType = (typeof LINE_TYPES)[number];

/** Fulfillment status for line items on a procurement / sales document. */
export const FULFILLMENT_STATUSES = [
  'pending',
  'partial',
  'fulfilled',
  'returned',
  'cancelled',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/** Header status for purchase requests, purchase orders, returns. */
export const PURCHASING_DOCUMENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'open',
  'partially_received',
  'fully_received',
  'invoiced',
  'closed',
  'cancelled',
] as const;
export type PurchasingDocumentStatus =
  (typeof PURCHASING_DOCUMENT_STATUSES)[number];

/** Header status for quotations, sales orders, returns. */
export const SALES_DOCUMENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'sent',
  'accepted',
  'open',
  'partially_delivered',
  'fully_delivered',
  'invoiced',
  'closed',
  'expired',
  'cancelled',
] as const;
export type SalesDocumentStatus = (typeof SALES_DOCUMENT_STATUSES)[number];

/**
 * Source-type identifiers used in the GL posting queue, traceability links,
 * and as `sourceType` arguments to finance / warehouse adapters.
 *
 * Keep this list aligned with what `gl_posting_queue.source_type` and
 * `document_links.source_type` columns accept.
 */
export const SOURCE_TYPES = {
   PURCHASE_REQUEST: 'purchase_request',
   PURCHASE_ORDER: 'purchase_order',
   PURCHASE_RETURN: 'purchase_return',
   GOODS_RECEIPT: 'goods_receipt',
   SUPPLIER_INVOICE: 'supplier_invoice',
   SUPPLIER_PAYMENT: 'supplier_payment',
   QUOTATION: 'quotation',
   SALES_ORDER: 'sales_order',
   SALES_RETURN: 'sales_return',
   STOCK_ISSUANCE: 'stock_issuance',
   AR_INVOICE: 'sales_invoice',
   CUSTOMER_PAYMENT: 'customer_payment',
   PAYROLL_RUN: 'payroll_run',
   ASSET_DEPRECIATION: 'asset_depreciation',
 } as const;

export type SourceType = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];

/** GL event names used when creating queue entries. */
export const GL_EVENTS = {
  PO_APPROVED: 'po_approved',
  PO_RECEIVED: 'po_received',
  PR_RETURNED: 'purchase_return_approved',
  SO_APPROVED: 'so_approved',
  SO_DELIVERED: 'so_delivered',
  SALES_RETURN_APPROVED: 'sales_return_approved',
  PAYROLL_RUN: 'payroll_run',
} as const;
