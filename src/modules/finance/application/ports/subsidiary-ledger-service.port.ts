export const SUBSIDIARY_LEDGER_SERVICE = Symbol('SUBSIDIARY_LEDGER_SERVICE')

export interface SubsidiaryLedgerServicePort {
  getArLedger(filters?: { customerId?: string; invoiceId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number }>
  getApLedger(filters?: { supplierId?: string; invoiceId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number }>
  getArCustomerSummary(): Promise<any[]>
  getApSupplierSummary(): Promise<any[]>
  getArInvoiceBalance(invoiceId: string): Promise<{ debit: number; credit: number; balance: number }>
  getApInvoiceBalance(invoiceId: string): Promise<{ debit: number; credit: number; balance: number }>
  recordArEntry(data: { customerId: string; customerName: string; journalEntryId?: string; glPostingQueueId?: string; invoiceId?: string; invoiceNumber?: string; date: string; description: string; debit: number; credit: number }): Promise<any>
  recordApEntry(data: { supplierId: string; supplierName: string; journalEntryId?: string; glPostingQueueId?: string; invoiceId?: string; invoiceNumber?: string; date: string; description: string; debit: number; credit: number }): Promise<any>
}
