import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AR_INVOICE_SERVICE } from '../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../finance/application/ports/ar-invoice-service.port';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import {
  SOURCE_TYPES,
  GL_EVENTS,
} from '../../../../modules/shared/commercial-document.constants';

/**
 * Sales → Finance adapter.
 *
 * Owns the conversion of SO / Sales Return documents into AR invoices and
 * GL posting queue entries. Service lines on the SO contribute to the
 * invoice amount (finance owns the accounting total) but skip the warehouse
 * stage (handled in `sales-warehouse.adapter.ts`).
 */
@Injectable()
export class SalesFinanceAdapter {
  constructor(
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
    private readonly dataSource: DataSource,
  ) {}

  async createDraftARInvoiceFromSO(
    soId: string,
    userId: string,
    overrides?: { dueDate?: string },
  ): Promise<{ arInvoiceId: string; invoiceNumber: string }> {
    const so: any[] = await this.dataSource.query(
      `SELECT id, so_number, customer_id, customer_name,
              grand_total, total_amount, tax_amount, discount_amount,
              payment_term_days, payment_term_label
       FROM sales_orders WHERE id = $1 LIMIT 1`,
      [soId],
    );
    if (so.length === 0) throw new BadRequestException('Sales order not found');
    const header = so[0];

    const today = new Date();
    const dueDate =
      overrides?.dueDate ??
      new Date(
        today.getTime() + (Number(header.payment_term_days) || 30) * 86400000,
      )
        .toISOString()
        .slice(0, 10);

    const lines: any[] = await this.dataSource.query(
      `SELECT id, item_id, item_name, description, quantity, unit_price, tax_percent, amount, line_type
       FROM sales_order_lines
       WHERE sales_order_id = $1
       ORDER BY id ASC`,
      [soId],
    );

    const created = await this.arInvoiceService.create(
      {
        clientId: header.customer_id,
        clientName: header.customer_name,
        invoiceDate: today.toISOString().slice(0, 10),
        dueDate,
        customerId: header.customer_id,
        paymentTermDays: Number(header.payment_term_days) || 30,
        paymentTermLabel: header.payment_term_label ?? undefined,
        additionalDiscount: Number(header.discount_amount ?? 0),
        asDraft: true,
        lines: lines.map((l) => ({
          description: l.description ?? l.item_name,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
          taxPercent: Number(l.tax_percent ?? 0),
        })),
      },
      true,
    );

    await this.recordLink(
      SOURCE_TYPES.SALES_ORDER,
      soId,
      SOURCE_TYPES.AR_INVOICE,
      created.id,
    );

    await this.dataSource.query(
      `UPDATE sales_orders SET status = 'invoiced', updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('invoiced', 'closed', 'cancelled')`,
      [soId],
    );

    return { arInvoiceId: created.id, invoiceNumber: created.invoiceNumber };
  }

  async recordSalesReturnGl(
    salesReturnId: string,
  ): Promise<{ glPostingQueueId: string }> {
    const ret: any[] = await this.dataSource.query(
      `SELECT id, return_number, customer_id, customer_name, total_amount
       FROM sales_returns WHERE id = $1 LIMIT 1`,
      [salesReturnId],
    );
    if (ret.length === 0)
      throw new BadRequestException('Sales return not found');
    const header = ret[0];
    const amount = Number(header.total_amount);
    if (amount <= 0) {
      throw new BadRequestException('Sales return has no amount to reverse');
    }

    const entry = await this.glPostingQueue.createEntry({
      sourceType: SOURCE_TYPES.SALES_RETURN,
      sourceId: header.id,
      sourceNumber: header.return_number,
      eventType: GL_EVENTS.SALES_RETURN_APPROVED,
      amount,
      description: `Sales Return ${header.return_number} - ${header.customer_name}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '1200',
          accountName: 'Accounts Receivable',
          debit: 0,
          credit: amount,
          description: `Credit AR for return ${header.return_number}`,
        },
        {
          accountId: '',
          accountCode: '4100',
          accountName: 'Sales Revenue (returns)',
          debit: amount,
          credit: 0,
          description: `Reverse revenue for return ${header.return_number}`,
        },
      ],
    });

    await this.dataSource.query(
      `UPDATE sales_returns SET gl_posting_queue_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [entry.id, salesReturnId],
    );

    return { glPostingQueueId: entry.id };
  }

  async recordSOApprovalGl(
    soId: string,
  ): Promise<{ glPostingQueueId: string }> {
    const so: any[] = await this.dataSource.query(
      `SELECT id, so_number, customer_id, customer_name, grand_total
       FROM sales_orders WHERE id = $1 LIMIT 1`,
      [soId],
    );
    if (so.length === 0) throw new BadRequestException('Sales order not found');
    const header = so[0];
    const amount = Number(header.grand_total);
    if (amount <= 0) {
      return { glPostingQueueId: '' };
    }

    const entry = await this.glPostingQueue.createEntry({
      sourceType: SOURCE_TYPES.SALES_ORDER,
      sourceId: header.id,
      sourceNumber: header.so_number,
      eventType: GL_EVENTS.SO_APPROVED,
      amount,
      description: `SO Approval ${header.so_number} - ${header.customer_name}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '1200',
          accountName: 'Accounts Receivable (Commitment)',
          debit: amount,
          credit: 0,
          description: `AR commitment for ${header.so_number}`,
        },
        {
          accountId: '',
          accountCode: '4199',
          accountName: 'Sales Commitment',
          debit: 0,
          credit: amount,
          description: `Sales commitment for ${header.so_number}`,
        },
      ],
    });

    await this.dataSource.query(
      `UPDATE sales_orders SET gl_posting_queue_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [entry.id, soId],
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
