import type { InvoiceWithLines } from '../services/ar-invoice.service'
import type { CreateARInvoiceCommand } from '../commands/create-ar-invoice.command'
import type { UpdateARInvoiceCommand } from '../commands/update-ar-invoice.command'
import type { RecordPaymentCommand } from '../commands/record-payment.command'

export const AR_INVOICE_SERVICE = Symbol('AR_INVOICE_SERVICE')

export interface ARInvoiceServicePort {
  findAll(filters?: {
    status?: string
    clientId?: string
    page?: number
    limit?: number
  }): Promise<{ data: InvoiceWithLines[]; total: number }>
  findById(id: string): Promise<InvoiceWithLines | null>
  create(command: CreateARInvoiceCommand, asDraft?: boolean): Promise<InvoiceWithLines>
  update(id: string, command: UpdateARInvoiceCommand): Promise<InvoiceWithLines>
  send(id: string): Promise<InvoiceWithLines>
  recordPayment(id: string, command: RecordPaymentCommand): Promise<InvoiceWithLines>
}