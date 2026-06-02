import {
  RepositoryPort,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';
import { Account } from '../entities/account.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalEntryLine } from '../entities/journal-entry-line.entity';
import { ARInvoice } from '../entities/ar-invoice.entity';
import { APPayment } from '../entities/ap-payment.entity';
import { Project } from '../entities/project.entity';
import { KpiThreshold } from '../entities/kpi-threshold.entity';
import { KpiAlert } from '../entities/kpi-alert.entity';
import { GlPostingQueue } from '../entities/gl-posting-queue.entity';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');
export const JOURNAL_ENTRY_REPOSITORY = Symbol('JOURNAL_ENTRY_REPOSITORY');
export const JOURNAL_ENTRY_LINE_REPOSITORY = Symbol(
  'JOURNAL_ENTRY_LINE_REPOSITORY',
);
export const AR_INVOICE_REPOSITORY = Symbol('AR_INVOICE_REPOSITORY');
export const AR_INVOICE_LINE_REPOSITORY = Symbol('AR_INVOICE_LINE_REPOSITORY');
export const AP_PAYMENT_REPOSITORY = Symbol('AP_PAYMENT_REPOSITORY');
export const AP_INVOICE_REPOSITORY = Symbol('AP_INVOICE_REPOSITORY');
export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
export const KPI_THRESHOLD_REPOSITORY = Symbol('KPI_THRESHOLD_REPOSITORY');
export const KPI_ALERT_REPOSITORY = Symbol('KPI_ALERT_REPOSITORY');
export const BANK_ACCOUNT_REPOSITORY = Symbol('BANK_ACCOUNT_REPOSITORY');
export const BANK_STATEMENT_LINE_REPOSITORY = Symbol(
  'BANK_STATEMENT_LINE_REPOSITORY',
);
export const RECONCILIATION_SESSION_REPOSITORY = Symbol(
  'RECONCILIATION_SESSION_REPOSITORY',
);
export const TAX_INVOICE_REPOSITORY = Symbol('TAX_INVOICE_REPOSITORY');
export const GL_POSTING_QUEUE_REPOSITORY = Symbol(
  'GL_POSTING_QUEUE_REPOSITORY',
);

export interface AccountRepositoryPort extends RepositoryPort<Account> {
  findByType(type: string): Promise<Account[]>;
  findBySegment(segment: string): Promise<Account[]>;
  findAllFlat(): Promise<Account[]>;
  findActive(): Promise<Account[]>;
  findByCode(code: string): Promise<Account | null>;
}

export interface JournalEntryRepositoryPort {
  findById(id: string): Promise<JournalEntry | null>;
  findAll(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: JournalEntry[]; total: number }>;
  save(entry: JournalEntry): Promise<JournalEntry>;
  getNextEntryNumber(): Promise<string>;
  countByAccountId(accountId: string): Promise<number>;
}

export interface JournalEntryLineRepositoryPort {
  findByDateRange(
    start: Date,
    end: Date,
    filters?: { segment?: string; projectId?: string; costCenter?: string },
  ): Promise<JournalEntryLine[]>;
  findByAccountIdsAndDateRange(
    accountIds: string[],
    start: Date,
    end: Date,
  ): Promise<JournalEntryLine[]>;
  findByJournalEntryId(journalEntryId: string): Promise<JournalEntryLine[]>;
  save(line: JournalEntryLine): Promise<JournalEntryLine>;
  saveMany(lines: JournalEntryLine[]): Promise<JournalEntryLine[]>;
  deleteByJournalEntryId(journalEntryId: string): Promise<void>;
}

export interface ARInvoiceRepositoryPort extends RepositoryPort<ARInvoice> {
  findOutstanding(): Promise<ARInvoice[]>;
  findByClientId(clientId: string): Promise<ARInvoice[]>;
  findByDateRange(start: Date, end: Date): Promise<ARInvoice[]>;
}

export interface ARInvoiceLineRepositoryPort {
  findByInvoiceId(invoiceId: string): Promise<any[]>;
  save(line: any): Promise<any>;
  create(data: any): any;
}

export interface APInvoiceRepositoryPort {
  findAll(filters?: {
    vendorId?: string;
    status?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any | null>;
  save(entity: any): Promise<any>;
  create(data: any): any;
  getNextInvoiceNumber(): Promise<string>;
  findByIds(ids: string[]): Promise<any[]>;
}

export interface APPaymentRepositoryPort extends RepositoryPort<APPayment> {
  findOutstanding(): Promise<APPayment[]>;
  findByDateRange(start: Date, end: Date): Promise<APPayment[]>;
}

export interface ProjectRepositoryPort extends RepositoryPort<Project> {
  findActive(): Promise<Project[]>;
  findBySegment(segment: string): Promise<Project[]>;
}

export interface KpiThresholdRepositoryPort {
  findAll(): Promise<KpiThreshold[]>;
  findByType(alertType: string): Promise<KpiThreshold | null>;
  save(threshold: KpiThreshold): Promise<KpiThreshold>;
}

export interface KpiAlertRepositoryPort {
  findAll(): Promise<KpiAlert[]>;
  findUnread(): Promise<KpiAlert[]>;
  findByType(type: string, since: Date): Promise<KpiAlert[]>;
  findById(id: string): Promise<KpiAlert | null>;
  save(alert: KpiAlert): Promise<KpiAlert>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface BankAccountRepositoryPort {
  findActive(): Promise<any[]>;
}

export interface BankStatementLineRepositoryPort {
  find(options: any): Promise<any[]>;
  findOne(options: any): Promise<any | null>;
  save(entity: any): Promise<any>;
  create(data: any): any;
}

export interface ReconciliationSessionRepositoryPort {
  findOne(options: any): Promise<any | null>;
  save(entity: any): Promise<any>;
  create(data: any): any;
}

export interface TaxInvoiceRepositoryPort {
  findByMonthAndYear(month: number, year: number): Promise<any[]>;
}

export interface GlPostingQueueRepositoryPort {
  findAll(filters?: {
    status?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GlPostingQueue[]; total: number }>;
  findById(id: string): Promise<GlPostingQueue | null>;
  findBySource(
    sourceType: string,
    sourceId: string,
  ): Promise<GlPostingQueue | null>;
  save(entity: GlPostingQueue): Promise<GlPostingQueue>;
  update(id: string, data: Partial<GlPostingQueue>): Promise<void>;
}
