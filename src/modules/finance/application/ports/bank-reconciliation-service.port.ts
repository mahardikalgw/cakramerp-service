import type { ImportStatementDto, ManualMatchDto, ReconciliationReport } from '../services/bank-reconciliation.service'

export const BANK_RECONCILIATION_SERVICE = Symbol('BANK_RECONCILIATION_SERVICE')

export interface BankReconciliationServicePort {
  getBankAccounts(): Promise<any[]>
  importStatement(dto: ImportStatementDto, userId: string): Promise<{ sessionId: string; linesImported: number }>
  autoMatch(sessionId: string): Promise<{ matchedCount: number }>
  manualMatch(sessionId: string, dto: ManualMatchDto): Promise<void>
  finalize(sessionId: string): Promise<void>
  getReport(sessionId: string): Promise<ReconciliationReport>
}
