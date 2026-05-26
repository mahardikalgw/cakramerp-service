import { FinancialStatementsServicePort } from '../ports/financial-statements-service.port'
import { Injectable, Inject } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  AccountRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'

export interface StatementLineItem {
  code: string
  name: string
  amount: number
  priorAmount?: number
  children?: StatementLineItem[]
}

export interface ProfitLossStatement {
  period: { from: string; to: string }
  priorPeriod?: { from: string; to: string }
  revenue: StatementLineItem[]
  totalRevenue: number
  priorTotalRevenue?: number
  cogs: StatementLineItem[]
  totalCogs: number
  priorTotalCogs?: number
  grossProfit: number
  priorGrossProfit?: number
  operatingExpenses: StatementLineItem[]
  totalOperatingExpenses: number
  priorTotalOperatingExpenses?: number
  netProfit: number
  priorNetProfit?: number
}

export interface BalanceSheetStatement {
  asOfDate: string
  assets: StatementLineItem[]
  totalAssets: number
  liabilities: StatementLineItem[]
  totalLiabilities: number
  equity: StatementLineItem[]
  totalEquity: number
  totalLiabilitiesAndEquity: number
}

export interface CashFlowStatement {
  period: { from: string; to: string }
  operatingActivities: StatementLineItem[]
  totalOperating: number
  investingActivities: StatementLineItem[]
  totalInvesting: number
  financingActivities: StatementLineItem[]
  totalFinancing: number
  netChange: number
  beginningBalance: number
  endingBalance: number
}

@Injectable()
export class FinancialStatementsService implements FinancialStatementsServicePort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {}

  async getProfitLoss(
    dateFrom: string,
    dateTo: string,
    comparePrior = false,
  ): Promise<ProfitLossStatement> {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)

    const revenueAccounts = await this.accountRepo.findByType('revenue')
    const expenseAccounts = await this.accountRepo.findByType('expense')
    const cogsAccounts = expenseAccounts.filter((a) => a.code.startsWith('5'))
    const opexAccounts = expenseAccounts.filter((a) => !a.code.startsWith('5'))

    const currentLines = await this.journalLineRepo.findByDateRange(from, to)

    // Prior period
    const duration = to.getTime() - from.getTime()
    const priorFrom = new Date(from.getTime() - duration)
    const priorTo = new Date(from.getTime() - 1)
    const priorLines = comparePrior
      ? await this.journalLineRepo.findByDateRange(priorFrom, priorTo)
      : []

    const calcAmount = (lines: any[], accountId: string, type: 'revenue' | 'expense'): number => {
      const accountLines = lines.filter((l: any) => l.accountId === accountId)
      if (type === 'revenue') {
        return accountLines.reduce((sum: number, l: any) => sum + l.credit.toNumber() - l.debit.toNumber(), 0)
      }
      return accountLines.reduce((sum: number, l: any) => sum + l.debit.toNumber() - l.credit.toNumber(), 0)
    }

    const buildItems = (accounts: any[], type: 'revenue' | 'expense'): StatementLineItem[] => {
      return accounts
        .map((acc) => ({
          code: acc.code,
          name: acc.name,
          amount: calcAmount(currentLines, acc.id, type),
          priorAmount: comparePrior ? calcAmount(priorLines, acc.id, type) : undefined,
        }))
        .filter((item) => item.amount !== 0 || (item.priorAmount && item.priorAmount !== 0))
    }

    const revenue = buildItems(revenueAccounts, 'revenue')
    const cogs = buildItems(cogsAccounts, 'expense')
    const operatingExpenses = buildItems(opexAccounts, 'expense')

    const totalRevenue = revenue.reduce((sum, i) => sum + i.amount, 0)
    const totalCogs = cogs.reduce((sum, i) => sum + i.amount, 0)
    const totalOperatingExpenses = operatingExpenses.reduce((sum, i) => sum + i.amount, 0)
    const grossProfit = totalRevenue - totalCogs
    const netProfit = grossProfit - totalOperatingExpenses

    const priorTotalRevenue = comparePrior ? revenue.reduce((sum, i) => sum + (i.priorAmount ?? 0), 0) : undefined
    const priorTotalCogs = comparePrior ? cogs.reduce((sum, i) => sum + (i.priorAmount ?? 0), 0) : undefined
    const priorTotalOperatingExpenses = comparePrior ? operatingExpenses.reduce((sum, i) => sum + (i.priorAmount ?? 0), 0) : undefined
    const priorGrossProfit = comparePrior ? (priorTotalRevenue! - priorTotalCogs!) : undefined
    const priorNetProfit = comparePrior ? (priorGrossProfit! - priorTotalOperatingExpenses!) : undefined

    return {
      period: { from: dateFrom, to: dateTo },
      priorPeriod: comparePrior ? { from: priorFrom.toISOString().split('T')[0], to: priorTo.toISOString().split('T')[0] } : undefined,
      revenue,
      totalRevenue,
      priorTotalRevenue,
      cogs,
      totalCogs,
      priorTotalCogs,
      grossProfit,
      priorGrossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      priorTotalOperatingExpenses,
      netProfit,
      priorNetProfit,
    }
  }

  async getBalanceSheet(asOfDate: string): Promise<BalanceSheetStatement> {
    const date = new Date(asOfDate)
    const startDate = new Date('2000-01-01')

    const assetAccounts = await this.accountRepo.findByType('asset')
    const liabilityAccounts = await this.accountRepo.findByType('liability')
    const equityAccounts = await this.accountRepo.findByType('equity')

    const allLines = await this.journalLineRepo.findByDateRange(startDate, date)

    const calcBalance = (accountId: string, type: 'asset' | 'liability' | 'equity'): number => {
      const lines = allLines.filter((l) => l.accountId === accountId)
      if (type === 'asset') {
        // Assets: debit increases, credit decreases
        return lines.reduce((sum, l) => sum + l.debit.toNumber() - l.credit.toNumber(), 0)
      }
      // Liabilities & Equity: credit increases, debit decreases
      return lines.reduce((sum, l) => sum + l.credit.toNumber() - l.debit.toNumber(), 0)
    }

    const assets: StatementLineItem[] = assetAccounts
      .map((acc) => ({ code: acc.code, name: acc.name, amount: calcBalance(acc.id, 'asset') }))
      .filter((i) => i.amount !== 0)

    const liabilities: StatementLineItem[] = liabilityAccounts
      .map((acc) => ({ code: acc.code, name: acc.name, amount: calcBalance(acc.id, 'liability') }))
      .filter((i) => i.amount !== 0)

    const equity: StatementLineItem[] = equityAccounts
      .map((acc) => ({ code: acc.code, name: acc.name, amount: calcBalance(acc.id, 'equity') }))
      .filter((i) => i.amount !== 0)

    // Add retained earnings (net profit) to equity
    const revenueAccounts = await this.accountRepo.findByType('revenue')
    const expenseAccounts = await this.accountRepo.findByType('expense')
    const totalRevenue = revenueAccounts.reduce(
      (sum, acc) => sum + allLines.filter((l) => l.accountId === acc.id).reduce((s, l) => s + l.credit.toNumber() - l.debit.toNumber(), 0),
      0,
    )
    const totalExpenses = expenseAccounts.reduce(
      (sum, acc) => sum + allLines.filter((l) => l.accountId === acc.id).reduce((s, l) => s + l.debit.toNumber() - l.credit.toNumber(), 0),
      0,
    )
    const retainedEarnings = totalRevenue - totalExpenses
    if (retainedEarnings !== 0) {
      equity.push({ code: 'RE', name: 'Retained Earnings', amount: retainedEarnings })
    }

    const totalAssets = assets.reduce((sum, i) => sum + i.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, i) => sum + i.amount, 0)
    const totalEquity = equity.reduce((sum, i) => sum + i.amount, 0)

    return {
      asOfDate,
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    }
  }

  async getCashFlow(dateFrom: string, dateTo: string): Promise<CashFlowStatement> {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const startDate = new Date('2000-01-01')

    const assetAccounts = await this.accountRepo.findByType('asset')
    const cashAccounts = assetAccounts.filter(
      (a) => a.code.startsWith('11') || a.code.startsWith('10'),
    )
    const cashAccountIds = cashAccounts.map((a) => a.id)

    if (cashAccountIds.length === 0) {
      return {
        period: { from: dateFrom, to: dateTo },
        operatingActivities: [],
        totalOperating: 0,
        investingActivities: [],
        totalInvesting: 0,
        financingActivities: [],
        totalFinancing: 0,
        netChange: 0,
        beginningBalance: 0,
        endingBalance: 0,
      }
    }

    // Beginning balance (all cash transactions before period)
    const priorLines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      cashAccountIds,
      startDate,
      new Date(from.getTime() - 1),
    )
    const beginningBalance = priorLines.reduce(
      (sum, l) => sum + l.debit.toNumber() - l.credit.toNumber(),
      0,
    )

    // Current period cash transactions
    const currentLines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      cashAccountIds,
      from,
      to,
    )

    const netChange = currentLines.reduce(
      (sum, l) => sum + l.debit.toNumber() - l.credit.toNumber(),
      0,
    )

    // Simplified categorization based on description patterns
    const operating: StatementLineItem[] = []
    const investing: StatementLineItem[] = []
    const financing: StatementLineItem[] = []

    // Group by description for summary
    const grouped = new Map<string, number>()
    for (const line of currentLines) {
      const desc = line.description ?? 'Other'
      const amount = line.debit.toNumber() - line.credit.toNumber()
      grouped.set(desc, (grouped.get(desc) ?? 0) + amount)
    }

    for (const [desc, amount] of grouped) {
      const item: StatementLineItem = { code: '', name: desc, amount }
      if (desc.toLowerCase().includes('loan') || desc.toLowerCase().includes('equity')) {
        financing.push(item)
      } else if (desc.toLowerCase().includes('invest') || desc.toLowerCase().includes('asset')) {
        investing.push(item)
      } else {
        operating.push(item)
      }
    }

    const totalOperating = operating.reduce((sum, i) => sum + i.amount, 0)
    const totalInvesting = investing.reduce((sum, i) => sum + i.amount, 0)
    const totalFinancing = financing.reduce((sum, i) => sum + i.amount, 0)

    return {
      period: { from: dateFrom, to: dateTo },
      operatingActivities: operating,
      totalOperating,
      investingActivities: investing,
      totalInvesting,
      financingActivities: financing,
      totalFinancing,
      netChange,
      beginningBalance,
      endingBalance: beginningBalance + netChange,
    }
  }

  async exportCsv(type: string, dateFrom: string, dateTo: string): Promise<string> {
    const rows: string[] = []

    if (type === 'profit-loss') {
      const data = await this.getProfitLoss(dateFrom, dateTo, true)
      rows.push(`Profit & Loss Statement`)
      rows.push(`Period: ${data.period.from} to ${data.period.to}`)
      rows.push('')
      rows.push('Account Code,Account Name,Current Period,Prior Period')
      rows.push('--- Revenue ---,,,')
      for (const item of data.revenue) {
        rows.push(`${item.code},"${item.name}",${item.amount},${item.priorAmount ?? 0}`)
      }
      rows.push(`,"Total Revenue",${data.totalRevenue},${data.priorTotalRevenue ?? 0}`)
      rows.push('--- COGS ---,,,')
      for (const item of data.cogs) {
        rows.push(`${item.code},"${item.name}",${item.amount},${item.priorAmount ?? 0}`)
      }
      rows.push(`,"Total COGS",${data.totalCogs},${data.priorTotalCogs ?? 0}`)
      rows.push(`,"Gross Profit",${data.grossProfit},${data.priorGrossProfit ?? 0}`)
      rows.push('--- Operating Expenses ---,,,')
      for (const item of data.operatingExpenses) {
        rows.push(`${item.code},"${item.name}",${item.amount},${item.priorAmount ?? 0}`)
      }
      rows.push(`,"Total Operating Expenses",${data.totalOperatingExpenses},${data.priorTotalOperatingExpenses ?? 0}`)
      rows.push(`,"Net Profit",${data.netProfit},${data.priorNetProfit ?? 0}`)
    } else if (type === 'balance-sheet') {
      const data = await this.getBalanceSheet(dateTo)
      rows.push(`Balance Sheet`)
      rows.push(`As of: ${data.asOfDate}`)
      rows.push('')
      rows.push('Account Code,Account Name,Amount')
      rows.push('--- Assets ---,,')
      for (const item of data.assets) {
        rows.push(`${item.code},"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Assets",${data.totalAssets}`)
      rows.push('--- Liabilities ---,,')
      for (const item of data.liabilities) {
        rows.push(`${item.code},"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Liabilities",${data.totalLiabilities}`)
      rows.push('--- Equity ---,,')
      for (const item of data.equity) {
        rows.push(`${item.code},"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Equity",${data.totalEquity}`)
    } else if (type === 'cash-flow') {
      const data = await this.getCashFlow(dateFrom, dateTo)
      rows.push(`Cash Flow Statement`)
      rows.push(`Period: ${data.period.from} to ${data.period.to}`)
      rows.push('')
      rows.push('Category,Description,Amount')
      rows.push('--- Operating Activities ---,,')
      for (const item of data.operatingActivities) {
        rows.push(`Operating,"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Operating",${data.totalOperating}`)
      rows.push('--- Investing Activities ---,,')
      for (const item of data.investingActivities) {
        rows.push(`Investing,"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Investing",${data.totalInvesting}`)
      rows.push('--- Financing Activities ---,,')
      for (const item of data.financingActivities) {
        rows.push(`Financing,"${item.name}",${item.amount}`)
      }
      rows.push(`,"Total Financing",${data.totalFinancing}`)
      rows.push('')
      rows.push(`,"Net Change in Cash",${data.netChange}`)
      rows.push(`,"Beginning Balance",${data.beginningBalance}`)
      rows.push(`,"Ending Balance",${data.endingBalance}`)
    }

    return rows.join('\n')
  }
}
