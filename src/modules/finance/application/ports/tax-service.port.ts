import type { TaxReportSummary } from '../services/tax.service'

export const TAX_SERVICE = Symbol('TAX_SERVICE')

export interface TaxServicePort {
  getMonthlyReport(month: number, year: number): Promise<TaxReportSummary>
  exportCsv(month: number, year: number): Promise<string>
  exportPdf(month: number, year: number): Promise<string>
}
