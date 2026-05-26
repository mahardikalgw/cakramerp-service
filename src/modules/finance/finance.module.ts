import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '@nestjs/cache-manager'
import { FinanceController } from './infrastructure/http/controllers/finance.controller'
import { FinanceManagementController } from './infrastructure/http/controllers/finance-management.controller'
import { FinanceService } from './application/services/finance.service'
import { EmailService } from './application/services/email.service'
import { AccountService } from './application/services/account.service'
import { JournalEntryService } from './application/services/journal-entry.service'
import { ARInvoiceService } from './application/services/ar-invoice.service'
import { APInvoiceService } from './application/services/ap-invoice.service'
import { TaxService } from './application/services/tax.service'
import { BankReconciliationService } from './application/services/bank-reconciliation.service'
import { FinancialStatementsService } from './application/services/financial-statements.service'
import { GlPostingQueueService } from './application/services/gl-posting-queue.service'
import { KpiAlertCheckJob } from './application/jobs/kpi-alert-check.job'
import { AccountTypeOrmEntity } from './infrastructure/entities/account-typeorm.entity'
import { JournalEntryTypeOrmEntity } from './infrastructure/entities/journal-entry-typeorm.entity'
import { JournalEntryLineTypeOrmEntity } from './infrastructure/entities/journal-entry-line-typeorm.entity'
import { ARInvoiceTypeOrmEntity } from './infrastructure/entities/ar-invoice-typeorm.entity'
import { ARInvoiceLineTypeOrmEntity } from './infrastructure/entities/ar-invoice-line-typeorm.entity'
import { APPaymentTypeOrmEntity } from './infrastructure/entities/ap-payment-typeorm.entity'
import { APInvoiceTypeOrmEntity } from './infrastructure/entities/ap-invoice-typeorm.entity'
import { ProjectTypeOrmEntity } from './infrastructure/entities/project-typeorm.entity'
import { KpiThresholdTypeOrmEntity } from './infrastructure/entities/kpi-threshold-typeorm.entity'
import { KpiAlertTypeOrmEntity } from './infrastructure/entities/kpi-alert-typeorm.entity'
import { BankAccountTypeOrmEntity } from './infrastructure/entities/bank-account-typeorm.entity'
import { BankStatementLineTypeOrmEntity } from './infrastructure/entities/bank-statement-line-typeorm.entity'
import { ReconciliationSessionTypeOrmEntity } from './infrastructure/entities/reconciliation-session-typeorm.entity'
import { TaxInvoiceTypeOrmEntity } from './infrastructure/entities/tax-invoice-typeorm.entity'
import { GlPostingQueueTypeOrmEntity } from './infrastructure/entities/gl-posting-queue-typeorm.entity'
import { AccountTypeOrmRepository } from './infrastructure/repositories/account-typeorm.repository'
import { ARInvoiceTypeOrmRepository } from './infrastructure/repositories/ar-invoice-typeorm.repository'
import { ARInvoiceLineTypeOrmRepository } from './infrastructure/repositories/ar-invoice-line-typeorm.repository'
import { APPaymentTypeOrmRepository } from './infrastructure/repositories/ap-payment-typeorm.repository'
import { APInvoiceTypeOrmRepository } from './infrastructure/repositories/ap-invoice-typeorm.repository'
import { ProjectTypeOrmRepository } from './infrastructure/repositories/project-typeorm.repository'
import { KpiThresholdTypeOrmRepository } from './infrastructure/repositories/kpi-threshold-typeorm.repository'
import { KpiAlertTypeOrmRepository } from './infrastructure/repositories/kpi-alert-typeorm.repository'
import { JournalEntryLineTypeOrmRepository } from './infrastructure/repositories/journal-entry-line-typeorm.repository'
import { JournalEntryTypeOrmRepository } from './infrastructure/repositories/journal-entry-typeorm.repository'
import { BankAccountTypeOrmRepository } from './infrastructure/repositories/bank-account-typeorm.repository'
import { BankStatementLineTypeOrmRepository } from './infrastructure/repositories/bank-statement-line-typeorm.repository'
import { ReconciliationSessionTypeOrmRepository } from './infrastructure/repositories/reconciliation-session-typeorm.repository'
import { TaxInvoiceTypeOrmRepository } from './infrastructure/repositories/tax-invoice-typeorm.repository'
import { GlPostingQueueTypeOrmRepository } from './infrastructure/repositories/gl-posting-queue-typeorm.repository'
import {
  ACCOUNT_REPOSITORY,
  AR_INVOICE_REPOSITORY,
  AR_INVOICE_LINE_REPOSITORY,
  AP_PAYMENT_REPOSITORY,
  AP_INVOICE_REPOSITORY,
  PROJECT_REPOSITORY,
  KPI_THRESHOLD_REPOSITORY,
  KPI_ALERT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  BANK_ACCOUNT_REPOSITORY,
  BANK_STATEMENT_LINE_REPOSITORY,
  RECONCILIATION_SESSION_REPOSITORY,
  TAX_INVOICE_REPOSITORY,
  GL_POSTING_QUEUE_REPOSITORY,
} from './domain/repositories/finance-repository.port'
import { FINANCE_SERVICE } from './application/ports/finance-service.port'
import { ACCOUNT_SERVICE } from './application/ports/account-service.port'
import { JOURNAL_ENTRY_SERVICE } from './application/ports/journal-entry-service.port'
import { AR_INVOICE_SERVICE } from './application/ports/ar-invoice-service.port'
import { AP_INVOICE_SERVICE } from './application/ports/ap-invoice-service.port'
import { TAX_SERVICE } from './application/ports/tax-service.port'
import { BANK_RECONCILIATION_SERVICE } from './application/ports/bank-reconciliation-service.port'
import { FINANCIAL_STATEMENTS_SERVICE } from './application/ports/financial-statements-service.port'
import { GL_POSTING_QUEUE_SERVICE } from './application/ports/gl-posting-queue-service.port'

@Module({
  imports: [
    CacheModule.register(),
    TypeOrmModule.forFeature([
      AccountTypeOrmEntity,
      JournalEntryTypeOrmEntity,
      JournalEntryLineTypeOrmEntity,
      ARInvoiceTypeOrmEntity,
      ARInvoiceLineTypeOrmEntity,
      APPaymentTypeOrmEntity,
      APInvoiceTypeOrmEntity,
      ProjectTypeOrmEntity,
      KpiThresholdTypeOrmEntity,
      KpiAlertTypeOrmEntity,
      BankAccountTypeOrmEntity,
      BankStatementLineTypeOrmEntity,
      ReconciliationSessionTypeOrmEntity,
      TaxInvoiceTypeOrmEntity,
      GlPostingQueueTypeOrmEntity,
    ]),
  ],
  controllers: [FinanceController, FinanceManagementController],
  providers: [
    EmailService,
    KpiAlertCheckJob,
    // Repository bindings
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: AccountTypeOrmRepository,
    },
    {
      provide: AR_INVOICE_REPOSITORY,
      useClass: ARInvoiceTypeOrmRepository,
    },
    {
      provide: AR_INVOICE_LINE_REPOSITORY,
      useClass: ARInvoiceLineTypeOrmRepository,
    },
    {
      provide: AP_PAYMENT_REPOSITORY,
      useClass: APPaymentTypeOrmRepository,
    },
    {
      provide: AP_INVOICE_REPOSITORY,
      useClass: APInvoiceTypeOrmRepository,
    },
    {
      provide: PROJECT_REPOSITORY,
      useClass: ProjectTypeOrmRepository,
    },
    {
      provide: KPI_THRESHOLD_REPOSITORY,
      useClass: KpiThresholdTypeOrmRepository,
    },
    {
      provide: KPI_ALERT_REPOSITORY,
      useClass: KpiAlertTypeOrmRepository,
    },
    {
      provide: JOURNAL_ENTRY_LINE_REPOSITORY,
      useClass: JournalEntryLineTypeOrmRepository,
    },
    {
      provide: JOURNAL_ENTRY_REPOSITORY,
      useClass: JournalEntryTypeOrmRepository,
    },
    {
      provide: BANK_ACCOUNT_REPOSITORY,
      useClass: BankAccountTypeOrmRepository,
    },
    {
      provide: BANK_STATEMENT_LINE_REPOSITORY,
      useClass: BankStatementLineTypeOrmRepository,
    },
    {
      provide: RECONCILIATION_SESSION_REPOSITORY,
      useClass: ReconciliationSessionTypeOrmRepository,
    },
    {
      provide: TAX_INVOICE_REPOSITORY,
      useClass: TaxInvoiceTypeOrmRepository,
    },
    {
      provide: GL_POSTING_QUEUE_REPOSITORY,
      useClass: GlPostingQueueTypeOrmRepository,
    },
    // Service bindings
    {
      provide: FINANCE_SERVICE,
      useClass: FinanceService,
    },
    {
      provide: ACCOUNT_SERVICE,
      useClass: AccountService,
    },
    {
      provide: JOURNAL_ENTRY_SERVICE,
      useClass: JournalEntryService,
    },
    {
      provide: AR_INVOICE_SERVICE,
      useClass: ARInvoiceService,
    },
    {
      provide: AP_INVOICE_SERVICE,
      useClass: APInvoiceService,
    },
    {
      provide: TAX_SERVICE,
      useClass: TaxService,
    },
    {
      provide: BANK_RECONCILIATION_SERVICE,
      useClass: BankReconciliationService,
    },
    {
      provide: FINANCIAL_STATEMENTS_SERVICE,
      useClass: FinancialStatementsService,
    },
    {
      provide: GL_POSTING_QUEUE_SERVICE,
      useClass: GlPostingQueueService,
    },
  ],
  exports: [FINANCE_SERVICE, ACCOUNT_SERVICE, JOURNAL_ENTRY_SERVICE, ACCOUNT_REPOSITORY],
})
export class FinanceModule {}
