export type GlPostingQueueStatus = 'pending' | 'posted' | 'cancelled';
export type GlPostingSourceType =
  | 'sales_invoice'
  | 'supplier_invoice'
  | 'asset_depreciation'
  | 'payroll'
  | 'spending'
  | 'goods_receipt'
  | 'stock_issuance'
  | 'stock_opname'
  | 'purchase_order'
  | 'purchase_return'
  | 'sales_order'
  | 'sales_return';
export type GlPostingEventType =
  | 'invoice_issued'
  | 'payment_received'
  | 'payment_made'
  | 'invoice_recorded'
  | 'depreciation'
  | 'payroll_run'
  | 'spending_recorded'
  | 'grn_received'
  | 'stock_issued'
  | 'stock_adjusted'
  | 'po_created'
  | 'purchase_returned'
  | 'so_created'
  | 'sales_returned';

export interface SuggestedLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export class GlPostingQueue {
  declare id: string;
  declare sourceType: GlPostingSourceType;
  declare sourceId: string;
  declare sourceNumber: string;
  declare eventType: GlPostingEventType;
  declare amount: number;
  declare description: string;
  declare suggestedLines: Record<string, unknown>[];
  declare status: GlPostingQueueStatus;
  declare journalEntryId?: string;
  declare postedBy?: string;
  declare postedAt?: Date;
  declare customerId?: string;
  declare supplierId?: string;
  declare invoiceId?: string;
  declare billingLetterId?: string;
  declare warehouseId?: string;
  declare spendingId?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<GlPostingQueue> & {
      sourceType: GlPostingSourceType;
      sourceId: string;
      sourceNumber: string;
      eventType: GlPostingEventType;
      amount: number;
      description: string;
    },
  ) {
    Object.assign(this, props);
    this.status = props.status ?? 'pending';
    this.suggestedLines = props.suggestedLines ?? [];
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
