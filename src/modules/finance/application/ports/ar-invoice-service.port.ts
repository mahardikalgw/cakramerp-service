import type { InvoiceWithLines } from '../services/ar-invoice.service';
import type { CreateARInvoiceCommand } from '../commands/create-ar-invoice.command';
import type { UpdateARInvoiceCommand } from '../commands/update-ar-invoice.command';
import type { RecordPaymentCommand } from '../commands/record-payment.command';

export const AR_INVOICE_SERVICE = Symbol('AR_INVOICE_SERVICE');

export interface ARInvoiceServicePort {
  findAll(filters?: {
    status?: string;
    clientId?: string;
    customerId?: string;
    sourceType?: string;
    contractId?: string;
    testingScheduleId?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: InvoiceWithLines[]; total: number }>;
  findById(id: string): Promise<InvoiceWithLines | null>;
  /** Find the AR invoice linked to a sales order, if any. */
  findBySalesOrderId(salesOrderId: string): Promise<InvoiceWithLines | null>;
  findByContractId(contractId: string): Promise<InvoiceWithLines[]>;
  findByCustomerId(
    customerId: string,
    options?: { status?: string; page?: number; limit?: number },
  ): Promise<{ data: InvoiceWithLines[]; total: number }>;
  create(
    command: CreateARInvoiceCommand,
    asDraft?: boolean,
  ): Promise<InvoiceWithLines>;
  update(
    id: string,
    command: UpdateARInvoiceCommand,
  ): Promise<InvoiceWithLines>;
  send(id: string): Promise<InvoiceWithLines>;
  recordPayment(
    id: string,
    command: RecordPaymentCommand,
  ): Promise<InvoiceWithLines>;
  /** Download URL for the generated invoice PDF. */
  getDownloadUrl(id: string): Promise<{ url: string; filename: string }>;
  /** Customer uploads payment proof against an issued invoice. */
  uploadPaymentProof(
    id: string,
    file: any,
    userId: string,
    userName?: string,
  ): Promise<InvoiceWithLines>;
  /** Download URL for the uploaded payment proof. */
  getPaymentProofDownloadUrl(
    id: string,
  ): Promise<{ url: string; filename: string }>;
  /** Admin confirms the lab payment proof attached to an invoice. */
  verifyLabPayment(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines>;
  /** Admin marks an invoice as paid directly (no payment proof required). */
  markAsPaid(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines>;
  /**
   * Marks the AR invoice linked to a sales order as paid without enqueueing a
   * GL posting (the sales-order flow owns the payment GL). Returns null when
   * no invoice is linked to the sales order.
   */
  markAsPaidBySalesOrderId(
    salesOrderId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines | null>;
  /** Soft-delete an invoice (paid invoices cannot be deleted). */
  delete(id: string): Promise<void>;
}
