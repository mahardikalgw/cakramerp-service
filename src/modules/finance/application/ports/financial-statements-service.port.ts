import type { ProfitLossStatement, BalanceSheetStatement, CashFlowStatement } from '../services/financial-statements.service'

export const FINANCIAL_STATEMENTS_SERVICE = Symbol('FINANCIAL_STATEMENTS_SERVICE')

export interface FinancialStatementsServicePort {
  getProfitLoss(dateFrom: string, dateTo: string, comparePrior?: boolean): Promise<ProfitLossStatement>
  getBalanceSheet(asOfDate: string): Promise<BalanceSheetStatement>
  getCashFlow(dateFrom: string, dateTo: string): Promise<CashFlowStatement>
  exportCsv(type: string, dateFrom: string, dateTo: string): Promise<string>
}
