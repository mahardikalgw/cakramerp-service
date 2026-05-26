import type { ReconciliationReport } from '../services/bank-reconciliation.service'
import type { ImportBankStatementCommand } from '../commands/import-bank-statement.command'
import type { ManualReconciliationMatchCommand } from '../commands/manual-reconciliation-match.command'

export const BANK_RECONCILIATION_SERVICE = Symbol('BANK_RECONCILIATION_SERVICE')

export interface BankReconciliationServicePort {
  getBankAccounts(): Promise<any[]>
  importStatement(command: ImportBankStatementCommand, userId: string): Promise<{ sessionId: string; linesImported: number }>
  autoMatch(sessionId: string): Promise<{ matchedCount: number }>
  manualMatch(sessionId: string, command: ManualReconciliationMatchCommand): Promise<void>
  finalize(sessionId: string): Promise<void>
  getReport(sessionId: string): Promise<ReconciliationReport>
}