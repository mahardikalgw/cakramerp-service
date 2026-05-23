import type { CreateAPInvoiceDto, SchedulePaymentDto, BulkPaymentDto, APInvoiceResponse } from '../services/ap-invoice.service'

export const AP_INVOICE_SERVICE = Symbol('AP_INVOICE_SERVICE')

export interface APInvoiceServicePort {
  findAll(filters?: {
    vendorId?: string
    status?: string
    dueDateFrom?: string
    dueDateTo?: string
    page?: number
    limit?: number
  }): Promise<{ data: APInvoiceResponse[]; total: number }>
  findById(id: string): Promise<APInvoiceResponse | null>
  create(dto: CreateAPInvoiceDto): Promise<APInvoiceResponse>
  schedulePayment(id: string, dto: SchedulePaymentDto): Promise<APInvoiceResponse>
  bulkPayment(dto: BulkPaymentDto): Promise<{ paid: number; totalAmount: number }>
}
