import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlPostingQueueTypeOrmEntity } from '../../infrastructure/entities/gl-posting-queue-typeorm.entity';
import { SUBSIDIARY_LEDGER_SERVICE } from '../ports/subsidiary-ledger-service.port';
import type { SubsidiaryLedgerServicePort } from '../ports/subsidiary-ledger-service.port';

@Injectable()
export class BillingLetterService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(SUBSIDIARY_LEDGER_SERVICE)
    private readonly subsidiaryLedgerService: SubsidiaryLedgerServicePort,
  ) {}

  async findAll(filters?: {
    type?: string;
    status?: string;
    customerId?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.type) {
      where += ` AND bl.type = $${paramIdx++}`;
      params.push(filters.type);
    }
    if (filters?.status) {
      where += ` AND bl.status = $${paramIdx++}`;
      params.push(filters.status);
    }
    if (filters?.customerId) {
      where += ` AND bl.customer_id = $${paramIdx++}`;
      params.push(filters.customerId);
    }
    if (filters?.supplierId) {
      where += ` AND bl.supplier_id = $${paramIdx++}`;
      params.push(filters.supplierId);
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM billing_letters bl ${where}`,
      params,
    );
    const total = parseInt(countResult[0]?.total ?? '0', 10);

    const data = await this.dataSource.query(
      `SELECT bl.* FROM billing_letters bl ${where} ORDER BY bl.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  async findById(id: string): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT * FROM billing_letters WHERE id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Billing letter not found');

    const items = await this.dataSource.query(
      `SELECT * FROM billing_letter_items WHERE billing_letter_id = $1 ORDER BY due_date ASC`,
      [id],
    );

    return { ...rows[0], items };
  }

  async generate(data: {
    type: 'receivable' | 'payable';
    customerId?: string;
    supplierId?: string;
    invoiceIds: string[];
    notes?: string;
    dueDate?: string;
    paymentAmount?: number;
  }): Promise<any> {
    const letterNumber = await this.generateLetterNumber(data.type);
    const today = new Date();

    let partyName = '';
    let totalOutstanding = 0;
    const items: any[] = [];
    const { invoiceTable, dateField } = this.validateInvoiceType(data.type);

    if (data.type === 'receivable' && data.customerId) {
      const custRows = await this.dataSource.query(
        `SELECT name FROM customers WHERE id = $1`,
        [data.customerId],
      );
      partyName = custRows[0]?.name ?? '';
    } else if (data.type === 'payable' && data.supplierId) {
      const supRows = await this.dataSource.query(
        `SELECT name FROM suppliers WHERE id = $1`,
        [data.supplierId],
      );
      partyName = supRows[0]?.name ?? '';
    } else {
      throw new BadRequestException('customerId or supplierId is required');
    }

    // Take latest invoice data (fresh from ap_invoices/ar_invoices) based on selected invoice IDs
    for (const invoiceId of data.invoiceIds) {
      const invRows = await this.dataSource.query(
        `SELECT id, invoice_number, ${dateField} as invoice_date, due_date, amount, paid_amount FROM ${invoiceTable} WHERE id = $1`,
        [invoiceId],
      );
      if (invRows.length) {
        const inv = invRows[0];
        const outstanding = Number(inv.amount) - Number(inv.paid_amount);
        const daysOverdue = inv.due_date
          ? Math.max(
              0,
              Math.floor(
                (today.getTime() - new Date(inv.due_date).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;
        items.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          dueDate: inv.due_date,
          amount: Number(inv.amount),
          paidAmount: Number(inv.paid_amount),
          outstandingAmount: outstanding,
          daysOverdue,
        });
        totalOutstanding += outstanding;
      }
    }

    // total_amount = what company will pay (from input)
    // outstanding_amount = current outstanding from invoices (latest from DB)
    const paymentAmount = data.paymentAmount ?? totalOutstanding;
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
    if (paymentAmount > totalOutstanding) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) exceeds total outstanding (${totalOutstanding})`,
      );
    }

    // Insert billing letter
    const letterResult = await this.dataSource.query(
      `INSERT INTO billing_letters (letter_number, type, customer_id, customer_name, supplier_id, supplier_name, issue_date, due_date, total_amount, paid_amount, outstanding_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        letterNumber,
        data.type,
        data.type === 'receivable' ? data.customerId : null,
        data.type === 'receivable' ? partyName : null,
        data.type === 'payable' ? data.supplierId : null,
        data.type === 'payable' ? partyName : null,
        today,
        data.dueDate ? new Date(data.dueDate) : null,
        paymentAmount,
        0,
        totalOutstanding,
        'outstanding',
        data.notes || null,
      ],
    );

    const letter = letterResult[0];

    // Insert billing letter items
    for (const item of items) {
      await this.dataSource.query(
        `INSERT INTO billing_letter_items (billing_letter_id, invoice_id, invoice_number, invoice_date, due_date, amount, paid_amount, outstanding_amount, days_overdue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          letter.id,
          item.invoiceId,
          item.invoiceNumber,
          item.invoiceDate,
          item.dueDate,
          item.amount,
          item.paidAmount,
          item.outstandingAmount,
          item.daysOverdue,
        ],
      );
    }

    // Auto-create GL Posting Queue entry with the payment amount
    const queueRepo = this.dataSource.getRepository(
      GlPostingQueueTypeOrmEntity,
    );

    if (data.type === 'payable' && data.supplierId) {
      // AP: Payment to supplier (Debit AP, Credit Bank)
      await queueRepo.save(
        queueRepo.create({
          sourceType: 'billing_letter',
          sourceId: letter.id,
          sourceNumber: letterNumber,
          eventType: 'payment_made',
          amount: paymentAmount,
          description: `Payment - ${letterNumber} - ${partyName}`,
          suggestedLines: [
            {
              accountId: '',
              accountCode: '2100',
              accountName: 'Accounts Payable',
              debit: paymentAmount,
              credit: 0,
              description: `Pay ${letterNumber}`,
            },
            {
              accountId: '',
              accountCode: '1100',
              accountName: 'Bank / Cash',
              debit: 0,
              credit: paymentAmount,
              description: `Payment to ${partyName}`,
            },
          ],
          status: 'pending',
          supplierId: data.supplierId,
          billingLetterId: letter.id,
        }),
      );
    } else if (data.type === 'receivable' && data.customerId) {
      // AR: Payment from customer (Debit Bank, Credit AR)
      await queueRepo.save(
        queueRepo.create({
          sourceType: 'billing_letter',
          sourceId: letter.id,
          sourceNumber: letterNumber,
          eventType: 'payment_received',
          amount: paymentAmount,
          description: `Receipt - ${letterNumber} - ${partyName}`,
          suggestedLines: [
            {
              accountId: '',
              accountCode: '1100',
              accountName: 'Bank / Cash',
              debit: paymentAmount,
              credit: 0,
              description: `Receipt from ${partyName}`,
            },
            {
              accountId: '',
              accountCode: '1200',
              accountName: 'Accounts Receivable',
              debit: 0,
              credit: paymentAmount,
              description: `Receive ${letterNumber}`,
            },
          ],
          status: 'pending',
          customerId: data.customerId,
          billingLetterId: letter.id,
        }),
      );
    }

    return { ...letter, items };
  }

  /**
   * Apply payment from a billing letter to its linked invoices (FIFO by due date).
   * Called when the journal entry is approved.
   * Updates ap_invoices.paid_amount or ar_invoices.paid_amount AND records per-invoice
   * subsidiary ledger entries so payment history is queryable per invoice.
   */
  async applyPayment(
    billingLetterId: string,
    journalEntryId: string,
  ): Promise<void> {
    const letterRows = await this.dataSource.query(
      `SELECT id, type, total_amount, customer_id, customer_name, supplier_id, supplier_name, letter_number FROM billing_letters WHERE id = $1`,
      [billingLetterId],
    );
    if (!letterRows.length) return;

    const letter = letterRows[0];
    const paymentAmount = Number(letter.total_amount);
    const { invoiceTable } = this.validateInvoiceType(letter.type);
    const today = new Date().toISOString().split('T')[0];

    // Get items sorted by due date (FIFO)
    const items = await this.dataSource.query(
      `SELECT id, invoice_id, invoice_number, due_date FROM billing_letter_items WHERE billing_letter_id = $1 ORDER BY due_date ASC NULLS LAST`,
      [billingLetterId],
    );

    let remainingPayment = paymentAmount;
    let totalPaidApplied = 0;

    for (const item of items) {
      if (remainingPayment <= 0) break;

      const invRows = await this.dataSource.query(
        `SELECT amount, paid_amount, status FROM ${invoiceTable} WHERE id = $1`,
        [item.invoice_id],
      );
      if (!invRows.length) continue;

      const invAmount = Number(invRows[0].amount);
      const invPaid = Number(invRows[0].paid_amount);
      const invOutstanding = invAmount - invPaid;

      if (invOutstanding <= 0) continue;

      const applyToInvoice = Math.min(remainingPayment, invOutstanding);
      const newPaidAmount = invPaid + applyToInvoice;
      const newStatus =
        newPaidAmount >= invAmount
          ? 'paid'
          : letter.type === 'receivable'
            ? 'partially_paid'
            : 'pending';

      await this.dataSource.query(
        `UPDATE ${invoiceTable} SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newPaidAmount, newStatus, item.invoice_id],
      );

      const itemOutstanding = invAmount - newPaidAmount;
      await this.dataSource.query(
        `UPDATE billing_letter_items SET paid_amount = $1, outstanding_amount = $2 WHERE id = $3`,
        [newPaidAmount, itemOutstanding, item.id],
      );

      // Record subsidiary ledger entry PER invoice (so per-invoice payment history works)
      if (letter.type === 'payable' && letter.supplier_id) {
        await this.subsidiaryLedgerService.recordApEntry({
          supplierId: letter.supplier_id,
          supplierName: letter.supplier_name || '',
          journalEntryId,
          invoiceId: item.invoice_id,
          invoiceNumber: item.invoice_number,
          date: today,
          description: `Payment via ${letter.letter_number} - Invoice ${item.invoice_number}`,
          debit: applyToInvoice,
          credit: 0,
        });
      } else if (letter.type === 'receivable' && letter.customer_id) {
        await this.subsidiaryLedgerService.recordArEntry({
          customerId: letter.customer_id,
          customerName: letter.customer_name || '',
          journalEntryId,
          invoiceId: item.invoice_id,
          invoiceNumber: item.invoice_number,
          date: today,
          description: `Receipt via ${letter.letter_number} - Invoice ${item.invoice_number}`,
          debit: 0,
          credit: applyToInvoice,
        });
      }

      remainingPayment -= applyToInvoice;
      totalPaidApplied += applyToInvoice;
    }

    const status =
      totalPaidApplied >= Number(letter.total_amount)
        ? 'paid'
        : 'partially_paid';
    await this.dataSource.query(
      `UPDATE billing_letters SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [totalPaidApplied, status, billingLetterId],
    );
  }

  /**
   * Manual sync: recompute billing letter status from current invoice states.
   * Used when invoice payments are made outside the billing letter flow.
   */
  async updateStatus(id: string): Promise<any> {
    const letter = await this.findById(id);
    const { invoiceTable } = this.validateInvoiceType(letter.type);

    let totalItemsPaid = 0;
    let totalItemsOutstanding = 0;

    for (const item of letter.items) {
      const invRows = await this.dataSource.query(
        `SELECT amount, paid_amount FROM ${invoiceTable} WHERE id = $1`,
        [item.invoice_id],
      );
      if (invRows.length) {
        const paid = Number(invRows[0].paid_amount);
        const outstanding = Number(invRows[0].amount) - paid;
        totalItemsPaid += paid;
        totalItemsOutstanding += Math.max(0, outstanding);

        await this.dataSource.query(
          `UPDATE billing_letter_items SET paid_amount = $1, outstanding_amount = $2 WHERE id = $3`,
          [paid, Math.max(0, outstanding), item.id],
        );
      }
    }

    // total_amount stays as the original payment commitment
    // paid_amount tracks how much has actually been paid against the items
    let status = 'outstanding';
    if (totalItemsOutstanding <= 0) {
      status = 'paid';
    } else if (totalItemsPaid > 0) {
      status = 'partially_paid';
    }

    await this.dataSource.query(
      `UPDATE billing_letters SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = NOW() WHERE id = $4`,
      [totalItemsPaid, totalItemsOutstanding, status, id],
    );

    return this.findById(id);
  }

  private validateInvoiceType(type: string): {
    invoiceTable: string;
    dateField: string;
  } {
    if (type === 'receivable') {
      return { invoiceTable: 'ar_invoices', dateField: 'issue_date' };
    }
    if (type === 'payable') {
      return { invoiceTable: 'ap_invoices', dateField: 'invoice_date' };
    }
    throw new BadRequestException(
      "Invalid billing type. Must be 'receivable' or 'payable'.",
    );
  }

  private async generateLetterNumber(type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'receivable' ? `BL-AR-${year}-` : `BL-AP-${year}-`;
    const result = await this.dataSource.query(
      `SELECT letter_number FROM billing_letters WHERE letter_number LIKE $1 ORDER BY letter_number DESC LIMIT 1`,
      [`${prefix}%`],
    );
    if (!result.length) return `${prefix}0001`;
    const lastNum =
      parseInt(result[0].letter_number.replace(prefix, ''), 10) + 1;
    return `${prefix}${lastNum.toString().padStart(4, '0')}`;
  }

  async delete(id: string): Promise<void> {
    const letter = await this.findById(id);

    // Block deletion if any payment has been applied
    if (letter.status === 'paid' || letter.status === 'partially_paid') {
      throw new BadRequestException(
        'Cannot delete a billing letter that has been paid or partially paid',
      );
    }
    if (Number(letter.paid_amount) > 0) {
      throw new BadRequestException(
        'Cannot delete a billing letter with payments recorded',
      );
    }

    // Check if GL Posting Queue entry has already been posted to journal
    const queueRows = await this.dataSource.query(
      `SELECT id, status FROM gl_posting_queue WHERE billing_letter_id = $1`,
      [id],
    );
    const postedQueue = queueRows.find((q: any) => q.status === 'posted');
    if (postedQueue) {
      throw new BadRequestException(
        'Cannot delete: GL Posting Queue entry has already been posted to journal',
      );
    }

    // Cancel any pending GL Posting Queue entries
    await this.dataSource.query(
      `UPDATE gl_posting_queue SET status = 'cancelled', updated_at = NOW() WHERE billing_letter_id = $1 AND status = 'pending'`,
      [id],
    );

    // Delete billing letter items (cascade should handle this, but explicit for safety)
    await this.dataSource.query(
      `DELETE FROM billing_letter_items WHERE billing_letter_id = $1`,
      [id],
    );

    // Delete the billing letter
    await this.dataSource.query(`DELETE FROM billing_letters WHERE id = $1`, [
      id,
    ]);
  }
}
