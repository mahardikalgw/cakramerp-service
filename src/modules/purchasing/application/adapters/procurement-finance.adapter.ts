import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AP_INVOICE_SERVICE } from '../../../finance/application/ports/ap-invoice-service.port';
import type { APInvoiceServicePort } from '../../../finance/application/ports/ap-invoice-service.port';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import { SOURCE_TYPES, GL_EVENTS } from '../../../../modules/shared/commercial-document.constants';

/**
 * Procurement → Finance adapter.
 *
 * Owns the conversion of PO/PO Return documents into AP invoices and GL
 * posting queue entries. Service lines on a PO contribute to the invoice
 * amount just like goods lines (finance cares about the total, not whether
 * the warehouse touched the line).
 */
@Injectable()
export class ProcurementFinanceAdapter {
  constructor(
    @Inject(AP_INVOICE_SERVICE)
    private readonly apInvoiceService: APInvoiceServicePort,
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Build a draft AP invoice (status='pending') from a PO. Quantities and
   * prices come straight from PO lines; goods-only is intentionally not
   * enforced because finance is the owner of accounting totals.
   */
  async createDraftAPInvoiceFromPO(
    poId: string,
    userId: string,
    overrides?: { supplierInvoiceNumber?: string; dueDate?: string },
  ): Promise<{ apInvoiceId: string; invoiceNumber: string }> {
    const po: any[] = await this.dataSource.query(
      `SELECT id, po_number, supplier_id, supplier_name, total_amount, payment_term_days, payment_term_label, expected_delivery_date
       FROM purchase_orders WHERE id = $1 LIMIT 1`,
      [poId],
    );
    if (po.length === 0)
      throw new BadRequestException('Purchase order not found');
    const header = po[0];

    const today = new Date();
    const dueDate =
      overrides?.dueDate ??
      new Date(
        today.getTime() + (Number(header.payment_term_days) || 30) * 86400000,
      )
        .toISOString()
        .slice(0, 10);

    const grnId: { id: string } | undefined = (
      await this.dataSource.query(
        `SELECT id FROM goods_receipts WHERE po_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [poId],
      )
    )[0];

    const created = await this.apInvoiceService.create({
      vendorId: header.supplier_id,
      vendorName: header.supplier_name,
      supplierId: header.supplier_id,
      supplierInvoiceNumber:
        overrides?.supplierInvoiceNumber ?? header.po_number,
      poReferenceId: poId,
      grnReferenceId: grnId?.id,
      amount: Number(header.total_amount),
      additionalDiscount: 0,
      invoiceDate: today.toISOString().slice(0, 10),
      dueDate,
      paymentTermDays: Number(header.payment_term_days) || 30,
      paymentTermLabel: header.payment_term_label ?? undefined,
    });

    await this.recordLink(
      SOURCE_TYPES.PURCHASE_ORDER,
      poId,
      SOURCE_TYPES.SUPPLIER_INVOICE,
      created.id,
    );

    // Mark PO as invoiced if this is the first invoice
    await this.dataSource.query(
      `UPDATE purchase_orders SET status = 'invoiced', updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('invoiced', 'closed', 'cancelled')`,
      [poId],
    );

    return { apInvoiceId: created.id, invoiceNumber: created.invoiceNumber };
  }

  /**
   * On purchase-return approval, queue a GL entry reversing the AP.
   * The actual AP credit note is created as a separate AP invoice (negative).
   */
  async recordPurchaseReturnGl(
    purchaseReturnId: string,
  ): Promise<{ glPostingQueueId: string }> {
    const ret: any[] = await this.dataSource.query(
      `SELECT id, return_number, supplier_id, supplier_name, total_amount
       FROM purchase_returns WHERE id = $1 LIMIT 1`,
      [purchaseReturnId],
    );
    if (ret.length === 0)
      throw new BadRequestException('Purchase return not found');
    const header = ret[0];
    const amount = Number(header.total_amount);

    if (amount <= 0) {
      throw new BadRequestException('Purchase return has no amount to reverse');
    }

    const entry = await this.glPostingQueue.createEntry({
      sourceType: SOURCE_TYPES.PURCHASE_RETURN,
      sourceId: header.id,
      sourceNumber: header.return_number,
      eventType: GL_EVENTS.PR_RETURNED,
      amount,
      description: `Purchase Return ${header.return_number} - ${header.supplier_name}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '2100',
          accountName: 'Accounts Payable',
          debit: amount,
          credit: 0,
          description: `Debit AP for return ${header.return_number}`,
        },
        {
          accountId: '',
          accountCode: '1300',
          accountName: 'Inventory',
          debit: 0,
          credit: amount,
          description: `Inventory out via return ${header.return_number}`,
        },
      ],
    });

    await this.dataSource.query(
      `UPDATE purchase_returns SET gl_posting_queue_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [entry.id, purchaseReturnId],
    );

    return { glPostingQueueId: entry.id };
  }

  /**
   * Enqueue a PO approval GL entry (commitment to spend).
   */
  async recordPOApprovalGl(
    poId: string,
  ): Promise<{ glPostingQueueId: string }> {
    const po: any[] = await this.dataSource.query(
      `SELECT id, po_number, supplier_id, supplier_name, total_amount
       FROM purchase_orders WHERE id = $1 LIMIT 1`,
      [poId],
    );
    if (po.length === 0)
      throw new BadRequestException('Purchase order not found');
    const header = po[0];
    const amount = Number(header.total_amount);
    if (amount <= 0) {
      return { glPostingQueueId: '' };
    }

    const entry = await this.glPostingQueue.createEntry({
      sourceType: SOURCE_TYPES.PURCHASE_ORDER,
      sourceId: header.id,
      sourceNumber: header.po_number,
      eventType: GL_EVENTS.PO_APPROVED,
      amount,
      description: `PO Approval ${header.po_number} - ${header.supplier_name}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '1399',
          accountName: 'Purchase Commitment',
          debit: amount,
          credit: 0,
          description: `Commitment for ${header.po_number}`,
        },
        {
          accountId: '',
          accountCode: '2100',
          accountName: 'Accounts Payable (Commitment)',
          debit: 0,
          credit: amount,
          description: `AP commitment for ${header.po_number}`,
        },
      ],
    });

    await this.dataSource.query(
      `UPDATE purchase_orders SET gl_posting_queue_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [entry.id, poId],
    );

    return { glPostingQueueId: entry.id };
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
