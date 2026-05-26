import { BankReconciliationServicePort } from '../ports/bank-reconciliation-service.port'
import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import {
  BANK_ACCOUNT_REPOSITORY,
  BANK_STATEMENT_LINE_REPOSITORY,
  RECONCILIATION_SESSION_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  BankAccountRepositoryPort,
  BankStatementLineRepositoryPort,
  ReconciliationSessionRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { ImportBankStatementCommand } from '../commands/import-bank-statement.command'
import { ManualReconciliationMatchCommand } from '../commands/manual-reconciliation-match.command'

export interface ReconciliationReport {
  id: string
  bankAccountId: string
  periodStart: string
  periodEnd: string
  status: string
  isLocked: boolean
  matchedTotal: number
  unmatchedGlCount: number
  unmatchedBankCount: number
  difference: number
  matchedPairs: { bankLine: any; glLine: any }[]
  unmatchedBankLines: any[]
  unmatchedGlLines: any[]
}

@Injectable()
export class BankReconciliationService implements BankReconciliationServicePort {
  constructor(
    @Inject(BANK_ACCOUNT_REPOSITORY)
    private readonly bankAccountRepo: BankAccountRepositoryPort,
    @Inject(BANK_STATEMENT_LINE_REPOSITORY)
    private readonly statementLineRepo: BankStatementLineRepositoryPort,
    @Inject(RECONCILIATION_SESSION_REPOSITORY)
    private readonly sessionRepo: ReconciliationSessionRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {}

  async getBankAccounts(): Promise<any[]> {
    return this.bankAccountRepo.findActive()
  }

  async importStatement(command: ImportBankStatementCommand, userId: string): Promise<{ sessionId: string; linesImported: number }> {
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        bankAccountId: command.bankAccountId,
        periodStart: new Date(command.periodStart),
        periodEnd: new Date(command.periodEnd),
        status: 'in_progress',
        isLocked: false,
        createdBy: userId,
      }),
    )

    for (const line of command.lines) {
      await this.statementLineRepo.save(
        this.statementLineRepo.create({
          reconciliationSessionId: session.id,
          date: new Date(line.date),
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          balance: line.balance,
          reference: line.reference,
          matchStatus: 'unmatched',
        }),
      )
    }

    return { sessionId: session.id, linesImported: command.lines.length }
  }

  async autoMatch(sessionId: string): Promise<{ matchedCount: number }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new BadRequestException('Session not found')
    if (session.isLocked) throw new BadRequestException('Session is locked')

    const bankLines = await this.statementLineRepo.find({
      where: { reconciliationSessionId: sessionId, matchStatus: 'unmatched' },
    })

    const glLines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [session.bankAccountId],
      session.periodStart,
      session.periodEnd,
    )

    let matchedCount = 0

    for (const bankLine of bankLines) {
      const bankAmount = Number(bankLine.debit) - Number(bankLine.credit)
      const bankDate = new Date(bankLine.date)

      const match = glLines.find((gl) => {
        const glAmount = gl.debit.toNumber() - gl.credit.toNumber()
        if (Math.abs(glAmount - bankAmount) > 0.01) return false

        const glDate = gl.createdAt
        const dayDiff = Math.abs(bankDate.getTime() - glDate.getTime()) / (1000 * 60 * 60 * 24)
        return dayDiff <= 1
      })

      if (match) {
        bankLine.matchedJournalLineId = match.id
        bankLine.matchStatus = 'matched'
        await this.statementLineRepo.save(bankLine)

        const idx = glLines.indexOf(match)
        if (idx > -1) glLines.splice(idx, 1)

        matchedCount++
      }
    }

    await this.updateSessionStats(sessionId)

    return { matchedCount }
  }

  async manualMatch(sessionId: string, command: ManualReconciliationMatchCommand): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new BadRequestException('Session not found')
    if (session.isLocked) throw new BadRequestException('Session is locked')

    const bankLine = await this.statementLineRepo.findOne({
      where: { id: command.bankStatementLineId, reconciliationSessionId: sessionId },
    })
    if (!bankLine) throw new BadRequestException('Bank statement line not found')

    bankLine.matchedJournalLineId = command.journalLineId
    bankLine.matchStatus = 'matched'
    await this.statementLineRepo.save(bankLine)

    await this.updateSessionStats(sessionId)
  }

  async finalize(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new BadRequestException('Session not found')
    if (session.isLocked) throw new BadRequestException('Session is already finalized')

    session.isLocked = true
    session.status = 'finalized'
    session.finalizedAt = new Date()
    await this.sessionRepo.save(session)
  }

  async getReport(sessionId: string): Promise<ReconciliationReport> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new BadRequestException('Session not found')

    const allBankLines = await this.statementLineRepo.find({
      where: { reconciliationSessionId: sessionId },
      order: { date: 'ASC' },
    })

    const matchedBankLines = allBankLines.filter((l: any) => l.matchStatus === 'matched')
    const unmatchedBankLines = allBankLines.filter((l: any) => l.matchStatus === 'unmatched')

    const glLines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [session.bankAccountId],
      session.periodStart,
      session.periodEnd,
    )

    const matchedGlIds = new Set(matchedBankLines.map((l: any) => l.matchedJournalLineId))
    const unmatchedGlLines = glLines.filter((l) => !matchedGlIds.has(l.id))

    const matchedTotal = matchedBankLines.reduce(
      (sum: number, l: any) => sum + Math.abs(Number(l.debit) - Number(l.credit)),
      0,
    )

    const bankTotal = allBankLines.reduce((sum: number, l: any) => sum + Number(l.debit) - Number(l.credit), 0)
    const glTotal = glLines.reduce((sum, l) => sum + l.debit.toNumber() - l.credit.toNumber(), 0)
    const difference = bankTotal - glTotal

    return {
      id: session.id,
      bankAccountId: session.bankAccountId,
      periodStart: session.periodStart?.toISOString?.() ?? String(session.periodStart),
      periodEnd: session.periodEnd?.toISOString?.() ?? String(session.periodEnd),
      status: session.status,
      isLocked: session.isLocked,
      matchedTotal,
      unmatchedGlCount: unmatchedGlLines.length,
      unmatchedBankCount: unmatchedBankLines.length,
      difference,
      matchedPairs: matchedBankLines.map((bl: any) => ({
        bankLine: bl,
        glLine: glLines.find((gl) => gl.id === bl.matchedJournalLineId),
      })),
      unmatchedBankLines,
      unmatchedGlLines,
    }
  }

  private async updateSessionStats(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } })
    if (!session) return

    const allLines = await this.statementLineRepo.find({
      where: { reconciliationSessionId: sessionId },
    })

    const matched = allLines.filter((l: any) => l.matchStatus === 'matched')
    const unmatched = allLines.filter((l: any) => l.matchStatus === 'unmatched')

    session.matchedTotal = matched.reduce(
      (sum: number, l: any) => sum + Math.abs(Number(l.debit) - Number(l.credit)),
      0,
    )
    session.unmatchedBankCount = unmatched.length

    await this.sessionRepo.save(session)
  }
}