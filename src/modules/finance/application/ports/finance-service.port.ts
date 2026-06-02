import type {
  KpiData,
  AgingBucket,
  CashFlowData,
  CashForecast,
  ProfitLossReport,
} from '../services/finance.service';
import { KpiAlert } from '../../domain/entities/kpi-alert.entity';

export const FINANCE_SERVICE = Symbol('FINANCE_SERVICE');

export interface FinanceServicePort {
  getKpiData(): Promise<KpiData>;
  getReceivablesAging(filters?: {
    clientId?: string;
    segment?: string;
    projectId?: string;
  }): Promise<AgingBucket[]>;
  getCashFlow(): Promise<CashFlowData>;
  getCashForecast(): Promise<CashForecast[]>;
  getProfitLossReport(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    segment?: string;
    projectId?: string;
    costCenter?: string;
  }): Promise<ProfitLossReport>;
  getAlertSettings(): Promise<
    { alertType: string; value: number; isActive: boolean }[]
  >;
  updateAlertSettings(
    settings: { alertType: string; value: number }[],
  ): Promise<void>;
  getAlerts(): Promise<KpiAlert[]>;
  getUnreadAlerts(): Promise<KpiAlert[]>;
  dismissAlert(id: string): Promise<void>;
  checkThresholdsAndCreateAlerts(): Promise<void>;
  getStatementOfAccount(clientId: string): Promise<{
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
  }>;
  getProfitLossExportData(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    segment?: string;
    projectId?: string;
    costCenter?: string;
  }): Promise<ProfitLossReport>;
}
