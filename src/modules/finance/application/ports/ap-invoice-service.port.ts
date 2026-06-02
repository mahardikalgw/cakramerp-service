import type { APInvoiceResponse } from '../services/ap-invoice.service';
import type { CreateAPInvoiceCommand } from '../commands/create-ap-invoice.command';
import type { SchedulePaymentCommand } from '../commands/schedule-payment.command';
import type { BulkPaymentCommand } from '../commands/bulk-payment.command';

export const AP_INVOICE_SERVICE = Symbol('AP_INVOICE_SERVICE');

export interface APInvoiceServicePort {
  findAll(filters?: {
    vendorId?: string;
    status?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: APInvoiceResponse[]; total: number }>;
  findById(id: string): Promise<APInvoiceResponse | null>;
  create(command: CreateAPInvoiceCommand): Promise<APInvoiceResponse>;
  schedulePayment(
    id: string,
    command: SchedulePaymentCommand,
  ): Promise<APInvoiceResponse>;
  bulkPayment(
    command: BulkPaymentCommand,
  ): Promise<{ paid: number; totalAmount: number }>;
}
