import { FinanceServicePort } from '../ports/finance-service.port';
import { Injectable, Inject } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import {
  ACCOUNT_REPOSITORY,
  AR_INVOICE_REPOSITORY,
  AP_PAYMENT_REPOSITORY,
  PROJECT_REPOSITORY,
  KPI_THRESHOLD_REPOSITORY,
  KPI_ALERT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import type {
  AccountRepositoryPort,
  ARInvoiceRepositoryPort,
  APPaymentRepositoryPort,
  ProjectRepositoryPort,
  KpiThresholdRepositoryPort,
  KpiAlertRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port';
import { KpiAlert } from '../../domain/entities/kpi-alert.entity';
import { KpiThreshold } from '../../domain/entities/kpi-threshold.entity';
import { EmailService } from './email.service';

export interface KpiData {
  revenueMtd: number;
  expensesMtd: number;
  netProfit: number;
  cashPosition: number;
  outstandingReceivables: number;
  outstandingReceivablesCount: number;
  outstandingPayables: number;
  outstandingPayablesCount: number;
  activeProjectsCount: number;
  avgProjectCompletion: number;
  revenueChange: number;
  expensesChange: number;
  netProfitChange: number;
}

export interface AgingBucket {
  clientId: string;
  clientName: string;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  total: number;
}

export interface CashFlowData {
  inflows: { category: string; month: number; ytd: number }[];
  outflows: { category: string; month: number; ytd: number }[];
}

export interface CashForecast {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface PlLineItem {
  label: string;
  currentPeriod: number;
  priorPeriod: number;
  variance: number;
  variancePercent: number;
}

export interface ProfitLossReport {
  revenue: PlLineItem[];
  cogs: PlLineItem[];
  operatingExpenses: PlLineItem[];
  summary: {
    totalRevenue: PlLineItem;
    totalCogs: PlLineItem;
    grossProfit: PlLineItem;
    totalOperatingExpenses: PlLineItem;
    netProfit: PlLineItem;
  };
}

@Injectable()
export class FinanceService implements FinanceServicePort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    @Inject(AR_INVOICE_REPOSITORY)
    private readonly arInvoiceRepo: ARInvoiceRepositoryPort,
    @Inject(AP_PAYMENT_REPOSITORY)
    private readonly apPaymentRepo: APPaymentRepositoryPort,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepo: ProjectRepositoryPort,
    @Inject(KPI_THRESHOLD_REPOSITORY)
    private readonly thresholdRepo: KpiThresholdRepositoryPort,
    @Inject(KPI_ALERT_REPOSITORY)
    private readonly alertRepo: KpiAlertRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    private readonly emailService: EmailService,
  ) {}

  async getKpiData(): Promise<KpiData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get revenue and expense accounts
    const revenueAccounts = await this.accountRepo.findByType('revenue');
    const expenseAccounts = await this.accountRepo.findByType('expense');
    const assetAccounts = await this.accountRepo.findByType('asset');

    const revenueAccountIds = revenueAccounts.map((a) => a.id);
    const expenseAccountIds = expenseAccounts.map((a) => a.id);
    // Cash accounts are typically asset accounts with code starting with '1' (cash/bank)
    const cashAccountIds = assetAccounts
      .filter((a) => a.code.startsWith('11') || a.code.startsWith('10'))
      .map((a) => a.id);

    // Current month journal lines
    const currentRevenueLines =
      await this.journalLineRepo.findByAccountIdsAndDateRange(
        revenueAccountIds,
        startOfMonth,
        now,
      );
    const currentExpenseLines =
      await this.journalLineRepo.findByAccountIdsAndDateRange(
        expenseAccountIds,
        startOfMonth,
        now,
      );

    // Prior month journal lines (for change calculation)
    const priorRevenueLines =
      await this.journalLineRepo.findByAccountIdsAndDateRange(
        revenueAccountIds,
        startOfLastMonth,
        endOfLastMonth,
      );
    const priorExpenseLines =
      await this.journalLineRepo.findByAccountIdsAndDateRange(
        expenseAccountIds,
        startOfLastMonth,
        endOfLastMonth,
      );

    // Cash position from all cash account lines (all time)
    const cashLines =
      cashAccountIds.length > 0
        ? await this.journalLineRepo.findByAccountIdsAndDateRange(
            cashAccountIds,
            new Date('2000-01-01'),
            now,
          )
        : [];

    // Calculate revenue MTD (credits - debits for revenue accounts)
    const revenueMtd = currentRevenueLines.reduce(
      (sum, line) => sum.plus(line.credit).minus(line.debit),
      new Decimal(0),
    );

    // Calculate expenses MTD (debits - credits for expense accounts)
    const expensesMtd = currentExpenseLines.reduce(
      (sum, line) => sum.plus(line.debit).minus(line.credit),
      new Decimal(0),
    );

    // Prior month totals
    const priorRevenue = priorRevenueLines.reduce(
      (sum, line) => sum.plus(line.credit).minus(line.debit),
      new Decimal(0),
    );
    const priorExpenses = priorExpenseLines.reduce(
      (sum, line) => sum.plus(line.debit).minus(line.credit),
      new Decimal(0),
    );

    // Cash position (debits - credits for asset accounts)
    const cashPosition = cashLines.reduce(
      (sum, line) => sum.plus(line.debit).minus(line.credit),
      new Decimal(0),
    );

    // Outstanding AR/AP
    const outstandingInvoices = await this.arInvoiceRepo.findOutstanding();
    const outstandingPayments = await this.apPaymentRepo.findOutstanding();
    const activeProjects = await this.projectRepo.findActive();

    const arTotal = outstandingInvoices.reduce(
      (sum, inv) => sum.plus(inv.balance),
      new Decimal(0),
    );
    const apTotal = outstandingPayments.reduce(
      (sum, p) => sum.plus(p.amount),
      new Decimal(0),
    );

    const avgCompletion =
      activeProjects.length > 0
        ? activeProjects.reduce((sum, p) => sum + p.completionPercent, 0) /
          activeProjects.length
        : 0;

    // Calculate percentage changes
    const revenueChange = priorRevenue.isZero()
      ? 0
      : revenueMtd.minus(priorRevenue).div(priorRevenue).times(100).toNumber();
    const expensesChange = priorExpenses.isZero()
      ? 0
      : expensesMtd
          .minus(priorExpenses)
          .div(priorExpenses)
          .times(100)
          .toNumber();
    const netProfit = revenueMtd.minus(expensesMtd);
    const priorNetProfit = priorRevenue.minus(priorExpenses);
    const netProfitChange = priorNetProfit.isZero()
      ? 0
      : netProfit
          .minus(priorNetProfit)
          .div(priorNetProfit.abs())
          .times(100)
          .toNumber();

    return {
      revenueMtd: revenueMtd.toNumber(),
      expensesMtd: expensesMtd.toNumber(),
      netProfit: netProfit.toNumber(),
      cashPosition: cashPosition.toNumber(),
      outstandingReceivables: arTotal.toNumber(),
      outstandingReceivablesCount: outstandingInvoices.length,
      outstandingPayables: apTotal.toNumber(),
      outstandingPayablesCount: outstandingPayments.length,
      activeProjectsCount: activeProjects.length,
      avgProjectCompletion: avgCompletion,
      revenueChange: Math.round(revenueChange * 10) / 10,
      expensesChange: Math.round(expensesChange * 10) / 10,
      netProfitChange: Math.round(netProfitChange * 10) / 10,
    };
  }

  async getReceivablesAging(filters?: {
    clientId?: string;
    segment?: string;
    projectId?: string;
  }): Promise<AgingBucket[]> {
    const invoices = await this.arInvoiceRepo.findOutstanding();
    const filtered = invoices.filter((inv) => {
      if (filters?.clientId && inv.clientId !== filters.clientId) return false;
      if (filters?.segment && inv.segment !== filters.segment) return false;
      if (filters?.projectId && inv.projectId !== filters.projectId)
        return false;
      return true;
    });

    const byClient = new Map<
      string,
      { clientName: string; invoices: typeof filtered }
    >();

    for (const inv of filtered) {
      if (!byClient.has(inv.clientId)) {
        byClient.set(inv.clientId, {
          clientName: inv.clientName,
          invoices: [],
        });
      }
      const clientData = byClient.get(inv.clientId);
      if (clientData) clientData.invoices.push(inv);
    }

    const result: AgingBucket[] = [];
    const now = new Date();
    for (const [clientId, { clientName, invoices }] of byClient) {
      const bucket: AgingBucket = {
        clientId,
        clientName,
        current: 0,
        days1To30: 0,
        days31To60: 0,
        days61To90: 0,
        days90Plus: 0,
        total: 0,
      };
      for (const inv of invoices) {
        const balance = inv.balance.toNumber();
        bucket.total += balance;
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        if (daysOverdue <= 0) {
          bucket.current += balance;
        } else if (daysOverdue <= 30) {
          bucket.days1To30 += balance;
        } else if (daysOverdue <= 60) {
          bucket.days31To60 += balance;
        } else if (daysOverdue <= 90) {
          bucket.days61To90 += balance;
        } else {
          bucket.days90Plus += balance;
        }
      }
      result.push(bucket);
    }
    return result.sort((a, b) => b.total - a.total);
  }

  async getCashFlow(): Promise<CashFlowData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all AR invoices paid this month and YTD for inflows
    const allInvoices = await this.arInvoiceRepo.findByDateRange(
      startOfYear,
      now,
    );
    const allPayments = await this.apPaymentRepo.findByDateRange(
      startOfYear,
      now,
    );

    // Also get outstanding data for categorization
    const paidInvoicesMonth = allInvoices.filter(
      (inv) => inv.status === 'paid' && inv.issueDate >= startOfMonth,
    );
    const paidInvoicesYtd = allInvoices.filter((inv) => inv.status === 'paid');

    const paidPaymentsMonth = allPayments.filter(
      (p) => p.status === 'paid' && p.paidDate && p.paidDate >= startOfMonth,
    );
    const paidPaymentsYtd = allPayments.filter((p) => p.status === 'paid');

    // Categorize inflows
    const projectReceiptsMonth = paidInvoicesMonth
      .filter((inv) => inv.projectId)
      .reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
    const projectReceiptsYtd = paidInvoicesYtd
      .filter((inv) => inv.projectId)
      .reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
    const operationsInflowMonth = paidInvoicesMonth
      .filter((inv) => !inv.projectId)
      .reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
    const operationsInflowYtd = paidInvoicesYtd
      .filter((inv) => !inv.projectId)
      .reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);

    // Categorize outflows
    const operationsOutflowMonth = paidPaymentsMonth
      .filter((p) => p.category === 'operations')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const operationsOutflowYtd = paidPaymentsYtd
      .filter((p) => p.category === 'operations')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const projectCostsMonth = paidPaymentsMonth
      .filter((p) => p.category === 'project')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const projectCostsYtd = paidPaymentsYtd
      .filter((p) => p.category === 'project')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const loanPaymentsMonth = paidPaymentsMonth
      .filter((p) => p.category === 'loan')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const loanPaymentsYtd = paidPaymentsYtd
      .filter((p) => p.category === 'loan')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    return {
      inflows: [
        {
          category: 'Operations',
          month: operationsInflowMonth,
          ytd: operationsInflowYtd,
        },
        {
          category: 'Project Receipts',
          month: projectReceiptsMonth,
          ytd: projectReceiptsYtd,
        },
        { category: 'Loan Repayments', month: 0, ytd: 0 },
      ],
      outflows: [
        {
          category: 'Operations',
          month: operationsOutflowMonth,
          ytd: operationsOutflowYtd,
        },
        {
          category: 'Project Costs',
          month: projectCostsMonth,
          ytd: projectCostsYtd,
        },
        {
          category: 'Loan Payments',
          month: loanPaymentsMonth,
          ytd: loanPaymentsYtd,
        },
      ],
    };
  }

  async getCashForecast(): Promise<CashForecast[]> {
    const invoices = await this.arInvoiceRepo.findOutstanding();
    const payments = await this.apPaymentRepo.findOutstanding();
    const forecast: CashForecast[] = [];
    const today = new Date();

    // Get current cash position for starting balance
    const kpis = await this.getKpiData();
    let runningBalance = kpis.cashPosition;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayInflow = invoices
        .filter((inv) => inv.dueDate.toISOString().split('T')[0] === dateStr)
        .reduce((sum, inv) => sum + inv.balance.toNumber(), 0);

      const dayOutflow = payments
        .filter((p) => p.scheduledDate.toISOString().split('T')[0] === dateStr)
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);

      runningBalance += dayInflow - dayOutflow;
      forecast.push({
        date: dateStr,
        inflow: dayInflow,
        outflow: dayOutflow,
        balance: runningBalance,
      });
    }
    return forecast;
  }

  async getProfitLossReport(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    segment?: string;
    projectId?: string;
    costCenter?: string;
  }): Promise<ProfitLossReport> {
    const now = new Date();
    const dateFrom =
      filters?.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = filters?.dateTo ?? now;

    // Calculate prior period (same duration, immediately before)
    const duration = dateTo.getTime() - dateFrom.getTime();
    const priorFrom = new Date(dateFrom.getTime() - duration);
    const priorTo = new Date(dateFrom.getTime() - 1);

    // Get accounts by type
    const revenueAccounts = await this.accountRepo.findByType('revenue');
    const expenseAccounts = await this.accountRepo.findByType('expense');

    // Separate COGS from operating expenses (accounts with code starting with '5' are COGS, '6' are OpEx)
    const cogsAccounts = expenseAccounts.filter((a) => a.code.startsWith('5'));
    const opexAccounts = expenseAccounts.filter((a) => !a.code.startsWith('5'));

    // Apply segment filter to accounts if specified
    const filterAccounts = (accounts: typeof revenueAccounts) => {
      if (filters?.segment) {
        return accounts.filter((a) => a.segment === filters.segment);
      }
      return accounts;
    };

    const filteredRevenueAccounts = filterAccounts(revenueAccounts);
    const filteredCogsAccounts = filterAccounts(cogsAccounts);
    const filteredOpexAccounts = filterAccounts(opexAccounts);

    const journalFilters = {
      segment: filters?.segment,
      projectId: filters?.projectId,
      costCenter: filters?.costCenter,
    };

    // Get current period lines
    const currentLines = await this.journalLineRepo.findByDateRange(
      dateFrom,
      dateTo,
      journalFilters,
    );
    // Get prior period lines
    const priorLines = await this.journalLineRepo.findByDateRange(
      priorFrom,
      priorTo,
      journalFilters,
    );

    const calcAccountTotal = (
      lines: typeof currentLines,
      accountId: string,
      type: 'revenue' | 'expense',
    ): number => {
      const accountLines = lines.filter((l) => l.accountId === accountId);
      if (type === 'revenue') {
        return accountLines.reduce(
          (sum, l) => sum + l.credit.minus(l.debit).toNumber(),
          0,
        );
      }
      return accountLines.reduce(
        (sum, l) => sum + l.debit.minus(l.credit).toNumber(),
        0,
      );
    };

    const buildLineItems = (
      accounts: typeof revenueAccounts,
      type: 'revenue' | 'expense',
    ): PlLineItem[] => {
      return accounts
        .map((account) => {
          const currentPeriod = calcAccountTotal(
            currentLines,
            account.id,
            type,
          );
          const priorPeriod = calcAccountTotal(priorLines, account.id, type);
          const variance = currentPeriod - priorPeriod;
          const variancePercent =
            priorPeriod !== 0 ? (variance / Math.abs(priorPeriod)) * 100 : 0;
          return {
            label: account.name,
            currentPeriod,
            priorPeriod,
            variance,
            variancePercent: Math.round(variancePercent * 10) / 10,
          };
        })
        .filter((item) => item.currentPeriod !== 0 || item.priorPeriod !== 0);
    };

    const revenue = buildLineItems(filteredRevenueAccounts, 'revenue');
    const cogs = buildLineItems(filteredCogsAccounts, 'expense');
    const operatingExpenses = buildLineItems(filteredOpexAccounts, 'expense');

    const sumItems = (
      items: PlLineItem[],
    ): { current: number; prior: number } => ({
      current: items.reduce((sum, i) => sum + i.currentPeriod, 0),
      prior: items.reduce((sum, i) => sum + i.priorPeriod, 0),
    });

    const revTotals = sumItems(revenue);
    const cogsTotals = sumItems(cogs);
    const opexTotals = sumItems(operatingExpenses);

    const grossProfitCurrent = revTotals.current - cogsTotals.current;
    const grossProfitPrior = revTotals.prior - cogsTotals.prior;
    const netProfitCurrent = grossProfitCurrent - opexTotals.current;
    const netProfitPrior = grossProfitPrior - opexTotals.prior;

    const buildSummaryItem = (
      label: string,
      current: number,
      prior: number,
    ): PlLineItem => {
      const variance = current - prior;
      const variancePercent =
        prior !== 0 ? (variance / Math.abs(prior)) * 100 : 0;
      return {
        label,
        currentPeriod: current,
        priorPeriod: prior,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10,
      };
    };

    return {
      revenue,
      cogs,
      operatingExpenses,
      summary: {
        totalRevenue: buildSummaryItem(
          'Total Revenue',
          revTotals.current,
          revTotals.prior,
        ),
        totalCogs: buildSummaryItem(
          'Total COGS',
          cogsTotals.current,
          cogsTotals.prior,
        ),
        grossProfit: buildSummaryItem(
          'Gross Profit',
          grossProfitCurrent,
          grossProfitPrior,
        ),
        totalOperatingExpenses: buildSummaryItem(
          'Total Operating Expenses',
          opexTotals.current,
          opexTotals.prior,
        ),
        netProfit: buildSummaryItem(
          'Net Profit',
          netProfitCurrent,
          netProfitPrior,
        ),
      },
    };
  }

  async getAlertSettings(): Promise<
    { alertType: string; value: number; isActive: boolean }[]
  > {
    const thresholds = await this.thresholdRepo.findAll();
    return thresholds.map((t) => ({
      alertType: t.alertType,
      value: t.value,
      isActive: t.isActive,
    }));
  }

  async updateAlertSettings(
    settings: { alertType: string; value: number }[],
  ): Promise<void> {
    for (const s of settings) {
      const existing = await this.thresholdRepo.findByType(s.alertType);
      if (existing) {
        existing.value = s.value;
        existing.isActive = true;
        await this.thresholdRepo.save(existing);
      } else {
        // Create new threshold if it doesn't exist
        const newThreshold = new KpiThreshold({
          alertType: s.alertType as any,
          value: s.value,
          isActive: true,
        });
        await this.thresholdRepo.save(newThreshold);
      }
    }
  }

  async getAlerts(): Promise<KpiAlert[]> {
    return this.alertRepo.findAll();
  }

  async getUnreadAlerts(): Promise<KpiAlert[]> {
    return this.alertRepo.findUnread();
  }

  async dismissAlert(id: string): Promise<void> {
    await this.alertRepo.updateStatus(id, 'dismissed');
  }

  async checkThresholdsAndCreateAlerts(): Promise<void> {
    const kpis = await this.getKpiData();
    const thresholds = await this.thresholdRepo.findAll();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const threshold of thresholds.filter((t) => t.isActive)) {
      let value = 0;
      let message = '';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      let url = '';

      switch (threshold.alertType) {
        case 'min_cash_balance':
          value = kpis.cashPosition;
          if (value < threshold.value) {
            message = `Cash balance (IDR ${value.toLocaleString()}) is below minimum threshold (IDR ${threshold.value.toLocaleString()})`;
            severity = 'high';
            url = '/reports/cash-flow';
          }
          break;
        case 'max_overdue_receivables':
          value = kpis.outstandingReceivables;
          if (value > threshold.value) {
            message = `Outstanding receivables (IDR ${value.toLocaleString()}) exceed maximum threshold (IDR ${threshold.value.toLocaleString()})`;
            severity = 'high';
            url = '/reports/receivables-aging';
          }
          break;
        case 'project_cost_overrun':
          value = kpis.avgProjectCompletion;
          if (value > threshold.value) {
            message = `Project cost overrun (${value}%) exceeds threshold (${threshold.value}%)`;
            severity = 'medium';
            url = '/dashboard';
          }
          break;
      }

      if (message) {
        // Debounce: don't re-create same alert type within 24h
        const existing = await this.alertRepo.findByType(
          threshold.alertType,
          yesterday,
        );
        if (existing.length === 0) {
          const alert = new KpiAlert({
            type: threshold.alertType,
            message,
            severity,
            relatedValue: value,
            thresholdValue: threshold.value,
            relatedUrl: url,
          });
          await this.alertRepo.save(alert);

          // Send email notification
          await this.emailService.sendAlertNotification({
            type: threshold.alertType,
            message,
            severity,
            relatedUrl: url,
          });
        }
      }
    }
  }

  async getStatementOfAccount(clientId: string): Promise<{
    clientId: string;
    clientName: string;
    invoices: {
      invoiceNumber: string;
      issueDate: string;
      dueDate: string;
      amount: number;
      paid: number;
      balance: number;
      status: string;
    }[];
    grandTotal: number;
  }> {
    const invoices = await this.arInvoiceRepo.findByClientId(clientId);
    const outstanding = invoices.filter(
      (inv) => inv.status !== 'paid' && inv.status !== 'cancelled',
    );

    if (outstanding.length === 0) {
      return { clientId, clientName: '', invoices: [], grandTotal: 0 };
    }

    const clientName = outstanding[0].clientName;
    const grandTotal = outstanding.reduce(
      (sum, inv) => sum + inv.balance.toNumber(),
      0,
    );

    return {
      clientId,
      clientName,
      invoices: outstanding.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        amount: inv.amount.toNumber(),
        paid: inv.paidAmount.toNumber(),
        balance: inv.balance.toNumber(),
        status: inv.status,
      })),
      grandTotal,
    };
  }

  async getProfitLossExportData(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    segment?: string;
    projectId?: string;
    costCenter?: string;
  }): Promise<ProfitLossReport> {
    return this.getProfitLossReport(filters);
  }
}
