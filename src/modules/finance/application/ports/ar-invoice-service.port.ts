import type { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto, InvoiceWithLines } from '../services/ar-invoice.service'

export const AR_INVOICE_SERVICE = Symbol('AR_INVOICE_SERVICE')

export interface ARInvoiceServicePort {
  findAll(filters?: {
    status?: string
    clientId?: string
    page?: number
    limit?: number
  }): Promise<{ data: InvoiceWithLines[]; total: number }>
  findById(id: string): Promise<InvoiceWithLines | null>
  create(dto: CreateInvoiceDto, asDraft?: boolean): Promise<InvoiceWithLines>
  update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceWithLines>
  send(id: string): Promise<InvoiceWithLines>
  recordPayment(id: string, dto: RecordPaymentDto): Promise<InvoiceWithLines>
}
