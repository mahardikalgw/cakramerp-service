import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Res,
  StreamableFile,
  Req,
  Inject,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { ACCOUNT_SERVICE } from '../../../application/ports/account-service.port';
import type { AccountServicePort } from '../../../application/ports/account-service.port';
import { JOURNAL_ENTRY_SERVICE } from '../../../application/ports/journal-entry-service.port';
import type { JournalEntryServicePort } from '../../../application/ports/journal-entry-service.port';
import { AR_INVOICE_SERVICE } from '../../../application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../application/ports/ar-invoice-service.port';
import { AP_INVOICE_SERVICE } from '../../../application/ports/ap-invoice-service.port';
import type { APInvoiceServicePort } from '../../../application/ports/ap-invoice-service.port';
import { TAX_SERVICE } from '../../../application/ports/tax-service.port';
import type { TaxServicePort } from '../../../application/ports/tax-service.port';
import { BANK_RECONCILIATION_SERVICE } from '../../../application/ports/bank-reconciliation-service.port';
import type { BankReconciliationServicePort } from '../../../application/ports/bank-reconciliation-service.port';
import { FINANCIAL_STATEMENTS_SERVICE } from '../../../application/ports/financial-statements-service.port';
import type { FinancialStatementsServicePort } from '../../../application/ports/financial-statements-service.port';
import { GL_POSTING_QUEUE_SERVICE } from '../../../application/ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../../../application/ports/gl-posting-queue-service.port';
import { SUBSIDIARY_LEDGER_SERVICE } from '../../../application/ports/subsidiary-ledger-service.port';
import type { SubsidiaryLedgerServicePort } from '../../../application/ports/subsidiary-ledger-service.port';
import { BillingLetterService } from '../../../application/services/billing-letter.service';
import { SpendingService } from '../../../application/services/spending.service';

import { CreateAccountCommand } from '../../../application/commands/create-account.command';
import { UpdateAccountCommand } from '../../../application/commands/update-account.command';
import { CreateJournalEntryCommand } from '../../../application/commands/create-journal-entry.command';
import { CreateARInvoiceCommand } from '../../../application/commands/create-ar-invoice.command';
import { UpdateARInvoiceCommand } from '../../../application/commands/update-ar-invoice.command';
import { RecordPaymentCommand } from '../../../application/commands/record-payment.command';
import { CreateAPInvoiceCommand } from '../../../application/commands/create-ap-invoice.command';
import { SchedulePaymentCommand } from '../../../application/commands/schedule-payment.command';
import { BulkPaymentCommand } from '../../../application/commands/bulk-payment.command';
import { ImportBankStatementCommand } from '../../../application/commands/import-bank-statement.command';
import { ManualReconciliationMatchCommand } from '../../../application/commands/manual-reconciliation-match.command';
import { PostGlToJournalCommand } from '../../../application/commands/post-gl-to-journal.command';

import {
  CreateAccountHttpDto,
  UpdateAccountHttpDto,
} from '../dtos/account.dto';
import { CreateJournalEntryHttpDto } from '../dtos/journal-entry.dto';
import {
  CreateARInvoiceHttpDto,
  UpdateARInvoiceHttpDto,
  RecordPaymentHttpDto,
} from '../dtos/ar-invoice.dto';
import {
  CreateAPInvoiceHttpDto,
  SchedulePaymentHttpDto,
  BulkPaymentHttpDto,
} from '../dtos/ap-invoice.dto';
import {
  ImportBankStatementHttpDto,
  ManualMatchHttpDto,
} from '../dtos/bank-reconciliation.dto';
import { PostGlToJournalHttpDto } from '../dtos/gl-posting-queue.dto';
import {
  CreateSpendingHttpDto,
  UpdateSpendingHttpDto,
} from '../dtos/spending.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceManagementController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ACCOUNT_SERVICE)
    private readonly accountService: AccountServicePort,
    @Inject(JOURNAL_ENTRY_SERVICE)
    private readonly journalEntryService: JournalEntryServicePort,
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
    @Inject(AP_INVOICE_SERVICE)
    private readonly apInvoiceService: APInvoiceServicePort,
    @Inject(TAX_SERVICE)
    private readonly taxService: TaxServicePort,
    @Inject(BANK_RECONCILIATION_SERVICE)
    private readonly reconciliationService: BankReconciliationServicePort,
    @Inject(FINANCIAL_STATEMENTS_SERVICE)
    private readonly financialStatementsService: FinancialStatementsServicePort,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
    @Inject(SUBSIDIARY_LEDGER_SERVICE)
    private readonly subsidiaryLedgerService: SubsidiaryLedgerServicePort,
    private readonly billingLetterService: BillingLetterService,
    private readonly spendingService: SpendingService,
  ) {}

  // ==================== Chart of Accounts ====================

  @Get('accounts')
  @RequirePermissions('chart-of-accounts:read')
  async getAccounts(@Query('format') format?: string) {
    if (format === 'flat') {
      return this.accountService.getActiveAccounts();
    }
    return this.accountService.getAccountTree();
  }

  @Post('accounts')
  @RequirePermissions('chart-of-accounts:create')
  async createAccount(@Body() dto: CreateAccountHttpDto) {
    const command = new CreateAccountCommand(
      dto.code,
      dto.name,
      dto.type as any,
      dto.taxCategory,
      dto.segment,
      dto.costCenter,
      dto.parentId,
    );
    return this.accountService.createAccount(command);
  }

  @Put('accounts/:id')
  @RequirePermissions('chart-of-accounts:update')
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountHttpDto,
  ) {
    const command = new UpdateAccountCommand(
      dto.code,
      dto.name,
      dto.type as any,
      dto.taxCategory,
      dto.segment,
      dto.costCenter,
      dto.parentId,
    );
    return this.accountService.updateAccount(id, command);
  }

  @Patch('accounts/:id/deactivate')
  @RequirePermissions('chart-of-accounts:delete')
  async deactivateAccount(@Param('id') id: string) {
    return this.accountService.deactivateAccount(id);
  }

  // ==================== Journal Entries ====================

  @Get('journal-entries')
  @RequirePermissions('journal-entries:read')
  async getJournalEntries(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journalEntryService.findAll({
      dateFrom,
      dateTo,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('journal-entries/:id')
  @RequirePermissions('journal-entries:read')
  async getJournalEntry(@Param('id') id: string) {
    const result = await this.journalEntryService.findById(id);
    if (!result) return null;

    const entry = result.entry as any;
    entry.createdByName = await this.resolveUserName(entry.createdBy);
    entry.approvedByName = entry.approvedBy
      ? await this.resolveUserName(entry.approvedBy)
      : null;

    if (entry.sourceType && entry.sourceId) {
      try {
        const table =
          entry.sourceType === 'sales_invoice' ? 'ar_invoices' : 'ap_invoices';
        const field =
          entry.sourceType === 'sales_invoice'
            ? 'invoice_number'
            : 'invoice_number';
        const rows = await this.dataSource.query(
          `SELECT ${field} FROM ${table} WHERE id = $1 LIMIT 1`,
          [entry.sourceId],
        );
        if (rows.length > 0) {
          entry.sourceNumber = rows[0][field];
        }
      } catch {}
    }

    return result;
  }

  private async resolveUserName(userId: string): Promise<string> {
    if (!userId || userId === 'unknown' || userId === 'system') return userId;
    try {
      const rows = await this.dataSource.query(
        `SELECT first_name, last_name FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      );
      if (rows.length > 0) {
        return `${rows[0].first_name} ${rows[0].last_name}`.trim();
      }
    } catch {}
    return userId;
  }

  @Post('journal-entries')
  @RequirePermissions('journal-entries:create')
  async createJournalEntry(
    @Body() dto: CreateJournalEntryHttpDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    const command = new CreateJournalEntryCommand(
      dto.date,
      dto.description,
      dto.lines,
      dto.reference,
      dto.segment,
      dto.projectId,
      dto.costCenter,
    );
    const result = await this.journalEntryService.create(
      command,
      userId,
      !dto.submitForApproval,
    );

    // Store journal type and party on the journal entry for subsidiary ledger recording on approval
    if (dto.journalType && dto.journalType !== 'cash') {
      if (dto.journalType === 'payment_payable' && dto.supplierId) {
        await this.dataSource.query(
          `UPDATE journal_entries SET journal_type = $1, supplier_id = $2, party_name = $3 WHERE id = $4`,
          [
            dto.journalType,
            dto.supplierId,
            dto.supplierName || '',
            result.entry.id,
          ],
        );
      } else if (dto.journalType === 'payment_receivable' && dto.customerId) {
        await this.dataSource.query(
          `UPDATE journal_entries SET journal_type = $1, customer_id = $2, party_name = $3 WHERE id = $4`,
          [
            dto.journalType,
            dto.customerId,
            dto.customerName || '',
            result.entry.id,
          ],
        );
      }
    }

    return result;
  }

  @Patch('journal-entries/:id/submit')
  @RequirePermissions('journal-entries:update')
  async submitJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.journalEntryService.submit(id, userId);
  }

  @Patch('journal-entries/:id/approve')
  @RequirePermissions('journal-entries:approve')
  async approveJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.journalEntryService.approve(id, userId);
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermissions('journal-entries:update')
  async reverseJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.journalEntryService.reverse(id, userId);
  }

  // ==================== AR Invoices ====================

  @Get('invoices')
  @RequirePermissions('sales-invoices:read')
  async getInvoices(
    @Query('status') status?: string,
    @Query('client_id') clientId?: string,
    @Query('customer_id') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.arInvoiceService.findAll({
      status,
      clientId,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('invoices/:id')
  @RequirePermissions('sales-invoices:read')
  async getInvoice(@Param('id') id: string) {
    return this.arInvoiceService.findById(id);
  }

  @Post('invoices')
  @RequirePermissions('sales-invoices:create')
  async createInvoice(@Body() dto: CreateARInvoiceHttpDto) {
    const command = new CreateARInvoiceCommand(
      dto.clientId,
      dto.clientName,
      dto.invoiceDate,
      dto.dueDate,
      dto.lines,
      dto.customerId,
      dto.segment,
      dto.projectId,
      dto.sendEmail,
      dto.paymentTermDays,
      dto.paymentTermLabel,
      dto.additionalDiscount,
      dto.asDraft,
    );
    return this.arInvoiceService.create(command, dto.asDraft !== false);
  }

  @Put('invoices/:id')
  @RequirePermissions('sales-invoices:update')
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateARInvoiceHttpDto,
  ) {
    const command = new UpdateARInvoiceCommand(
      dto.clientId,
      dto.clientName,
      dto.customerId,
      dto.invoiceDate,
      dto.dueDate,
      dto.segment,
      dto.projectId,
      dto.paymentTermDays,
      dto.paymentTermLabel,
      dto.additionalDiscount,
      dto.lines,
    );
    return this.arInvoiceService.update(id, command);
  }

  @Post('invoices/:id/send')
  @RequirePermissions('sales-invoices:update')
  async sendInvoice(@Param('id') id: string) {
    return this.arInvoiceService.send(id);
  }

  @Post('invoices/:id/record-payment')
  @RequirePermissions('sales-invoices:update')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentHttpDto,
  ) {
    const command = new RecordPaymentCommand(
      dto.amount,
      dto.paymentDate,
      dto.bankAccountId,
      dto.reference,
    );
    return this.arInvoiceService.recordPayment(id, command);
  }

  // ==================== AP Invoices ====================

  @Get('supplier-invoices')
  @RequirePermissions('supplier-invoices:read')
  async getSupplierInvoices(
    @Query('vendor_id') vendorId?: string,
    @Query('status') status?: string,
    @Query('due_date_from') dueDateFrom?: string,
    @Query('due_date_to') dueDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.apInvoiceService.findAll({
      vendorId,
      status,
      dueDateFrom,
      dueDateTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('supplier-invoices/:id')
  @RequirePermissions('supplier-invoices:read')
  async getSupplierInvoice(@Param('id') id: string) {
    return this.apInvoiceService.findById(id);
  }

  @Post('supplier-invoices')
  @RequirePermissions('supplier-invoices:create')
  async createSupplierInvoice(@Body() dto: CreateAPInvoiceHttpDto) {
    const command = new CreateAPInvoiceCommand(
      dto.vendorId,
      dto.vendorName,
      dto.invoiceDate,
      dto.dueDate,
      dto.amount,
      dto.supplierId,
      dto.supplierInvoiceNumber,
      dto.poReferenceId,
      dto.grnReferenceId,
      dto.paymentTermDays,
      dto.paymentTermLabel,
      dto.additionalDiscount,
      dto.lines,
    );
    return this.apInvoiceService.create(command);
  }

  @Post('ap-invoices/:id/schedule-payment')
  @RequirePermissions('supplier-invoices:update')
  async schedulePayment(
    @Param('id') id: string,
    @Body() dto: SchedulePaymentHttpDto,
  ) {
    const command = new SchedulePaymentCommand(dto.dueDate, dto.bankAccountId);
    return this.apInvoiceService.schedulePayment(id, command);
  }

  @Post('ap-payments/bulk')
  @RequirePermissions('supplier-invoices:update')
  async bulkPayment(@Body() dto: BulkPaymentHttpDto) {
    const command = new BulkPaymentCommand(
      dto.invoiceIds,
      dto.bankAccountId,
      dto.paymentDate,
      dto.reference,
    );
    return this.apInvoiceService.bulkPayment(command);
  }

  // ==================== Tax / e-Faktur ====================

  @Get('tax/ppn')
  @RequirePermissions('tax:read')
  async getTaxReport(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.taxService.getMonthlyReport(
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('tax/ppn/export/csv')
  @RequirePermissions('tax:read')
  async exportTaxCsv(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.taxService.exportCsv(
      parseInt(month, 10),
      parseInt(year, 10),
    );
    const filename = `e-faktur-${year}-${month.padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Get('tax/ppn/export/pdf')
  @RequirePermissions('tax:read')
  async exportTaxPdf(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const content = await this.taxService.exportPdf(
      parseInt(month, 10),
      parseInt(year, 10),
    );
    const filename = `ppn-report-${year}-${month.padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(content, 'utf-8'));
  }

  // ==================== Bank Reconciliation ====================

  @Get('reconciliation/bank-accounts')
  @RequirePermissions('bank-reconciliation:read')
  async getBankAccounts() {
    return this.reconciliationService.getBankAccounts();
  }

  @Post('reconciliation/import')
  @RequirePermissions('bank-reconciliation:create')
  async importStatement(
    @Body() dto: ImportBankStatementHttpDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    const command = new ImportBankStatementCommand(
      dto.bankAccountId,
      dto.periodStart,
      dto.periodEnd,
      dto.lines,
    );
    return this.reconciliationService.importStatement(command, userId);
  }

  @Post('reconciliation/:id/auto-match')
  @RequirePermissions('bank-reconciliation:update')
  async autoMatch(@Param('id') id: string) {
    return this.reconciliationService.autoMatch(id);
  }

  @Post('reconciliation/:id/manual-match')
  @RequirePermissions('bank-reconciliation:update')
  async manualMatch(@Param('id') id: string, @Body() dto: ManualMatchHttpDto) {
    const command = new ManualReconciliationMatchCommand(
      dto.bankStatementLineId,
      dto.journalLineId,
    );
    return this.reconciliationService.manualMatch(id, command);
  }

  @Post('reconciliation/:id/finalize')
  @RequirePermissions('bank-reconciliation:update')
  async finalizeReconciliation(@Param('id') id: string) {
    return this.reconciliationService.finalize(id);
  }

  @Get('reconciliation/:id/report')
  @RequirePermissions('bank-reconciliation:read')
  async getReconciliationReport(@Param('id') id: string) {
    return this.reconciliationService.getReport(id);
  }

  // ==================== Financial Statements ====================

  @Get('reports/financial-statements/:type')
  @RequirePermissions('financial-statements:read')
  async getFinancialStatement(
    @Param('type') type: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('compare_prior') comparePrior?: string,
  ) {
    const now = new Date();
    const from =
      dateFrom ??
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const to = dateTo ?? now.toISOString().split('T')[0];

    switch (type) {
      case 'profit-loss':
        return this.financialStatementsService.getProfitLoss(
          from,
          to,
          comparePrior === 'true',
        );
      case 'balance-sheet':
        return this.financialStatementsService.getBalanceSheet(to);
      case 'cash-flow':
        return this.financialStatementsService.getCashFlow(from, to);
      default:
        return {
          error:
            'Invalid statement type. Use: profit-loss, balance-sheet, or cash-flow',
        };
    }
  }

  @Get('reports/financial-statements/:type/export')
  @RequirePermissions('financial-statements:read')
  async exportFinancialStatement(
    @Param('type') type: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const now = new Date();
    const from =
      dateFrom ??
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const to = dateTo ?? now.toISOString().split('T')[0];

    const csv = await this.financialStatementsService.exportCsv(type, from, to);
    const filename = `${type}-${from}-to-${to}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  // ==================== GL Posting Queue ====================

  @Get('gl-posting-queue')
  @RequirePermissions('gl-posting-queue:read')
  async getGlPostingQueue(
    @Query('status') status?: string,
    @Query('source_type') sourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.glPostingQueueService.findAll({
      status,
      sourceType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('gl-posting-queue/:id')
  @RequirePermissions('gl-posting-queue:read')
  async getGlPostingQueueItem(@Param('id') id: string) {
    return this.glPostingQueueService.findById(id);
  }

  @Post('gl-posting-queue/:id/post')
  @RequirePermissions('gl-posting-queue:create')
  async postGlQueueToJournal(
    @Param('id') id: string,
    @Body() dto: PostGlToJournalHttpDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    const command = new PostGlToJournalCommand(
      dto.date,
      dto.description,
      dto.lines,
    );
    const result = await this.glPostingQueueService.postToJournal(
      id,
      command,
      userId,
    );

    // Store journal type and party on the journal entry for subsidiary ledger recording on approval
    const queueItem = await this.glPostingQueueService.findById(id);
    if (queueItem) {
      if (
        queueItem.sourceType === 'sales_invoice' &&
        (queueItem.customerId || (dto as any).customerId)
      ) {
        const custId = queueItem.customerId || (dto as any).customerId;
        const custName = (dto as any).customerName || queueItem.description;
        const invoiceId = queueItem.invoiceId || queueItem.sourceId;
        await this.dataSource.query(
          `UPDATE journal_entries SET journal_type = 'invoice_receivable', customer_id = $1, party_name = $2, invoice_id = $3 WHERE id = $4`,
          [custId, custName, invoiceId, result.journalEntryId],
        );
      } else if (
        queueItem.sourceType === 'supplier_invoice' &&
        (queueItem.supplierId || (dto as any).supplierId)
      ) {
        const supId = queueItem.supplierId || (dto as any).supplierId;
        const supName = (dto as any).supplierName || queueItem.description;
        const invoiceId = queueItem.invoiceId || queueItem.sourceId;
        await this.dataSource.query(
          `UPDATE journal_entries SET journal_type = 'invoice_payable', supplier_id = $1, party_name = $2, invoice_id = $3 WHERE id = $4`,
          [supId, supName, invoiceId, result.journalEntryId],
        );
      } else if (
        queueItem.sourceType === 'billing_letter' &&
        queueItem.billingLetterId
      ) {
        const billingLetterId = queueItem.billingLetterId;
        const invoiceId = queueItem.invoiceId || null;
        if (queueItem.supplierId) {
          await this.dataSource.query(
            `UPDATE journal_entries SET journal_type = 'payment_payable', supplier_id = $1, party_name = $2, invoice_id = $3, billing_letter_id = $4 WHERE id = $5`,
            [
              queueItem.supplierId,
              queueItem.description,
              invoiceId,
              billingLetterId,
              result.journalEntryId,
            ],
          );
        } else if (queueItem.customerId) {
          await this.dataSource.query(
            `UPDATE journal_entries SET journal_type = 'payment_receivable', customer_id = $1, party_name = $2, invoice_id = $3, billing_letter_id = $4 WHERE id = $5`,
            [
              queueItem.customerId,
              queueItem.description,
              invoiceId,
              billingLetterId,
              result.journalEntryId,
            ],
          );
        }
      }
    }

    return result;
  }

  @Patch('gl-posting-queue/:id/cancel')
  @RequirePermissions('gl-posting-queue:create')
  async cancelGlPostingQueueItem(@Param('id') id: string) {
    await this.glPostingQueueService.cancel(id);
    return { success: true };
  }

  // ==================== AR Subsidiary Ledger ====================

  @Get('ar-subsidiary-ledger')
  @RequirePermissions('ar-subsidiary-ledger:read')
  async getArSubsidiaryLedger(
    @Query('customer_id') customerId?: string,
    @Query('invoice_id') invoiceId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subsidiaryLedgerService.getArLedger({
      customerId,
      invoiceId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('ar-subsidiary-ledger/summary')
  @RequirePermissions('ar-subsidiary-ledger:read')
  async getArCustomerSummary() {
    return this.subsidiaryLedgerService.getArCustomerSummary();
  }

  // ==================== AP Subsidiary Ledger ====================

  @Get('ap-subsidiary-ledger')
  @RequirePermissions('ap-subsidiary-ledger:read')
  async getApSubsidiaryLedger(
    @Query('supplier_id') supplierId?: string,
    @Query('invoice_id') invoiceId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subsidiaryLedgerService.getApLedger({
      supplierId,
      invoiceId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('ap-subsidiary-ledger/summary')
  @RequirePermissions('ap-subsidiary-ledger:read')
  async getApSupplierSummary() {
    return this.subsidiaryLedgerService.getApSupplierSummary();
  }

  // ==================== Billing Letters ====================

  @Get('billing-letters')
  @RequirePermissions('billing-letters:read')
  async getBillingLetters(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingLetterService.findAll({
      type,
      status,
      customerId,
      supplierId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('billing-letters/:id')
  @RequirePermissions('billing-letters:read')
  async getBillingLetter(@Param('id') id: string) {
    return this.billingLetterService.findById(id);
  }

  @Post('billing-letters')
  @RequirePermissions('billing-letters:create')
  async generateBillingLetter(@Body() dto: Record<string, any>) {
    return this.billingLetterService.generate({
      type: dto.type,
      customerId: dto.customerId,
      supplierId: dto.supplierId,
      invoiceIds: dto.invoiceIds,
      notes: dto.notes,
      dueDate: dto.dueDate,
      paymentAmount: dto.paymentAmount,
    });
  }

  @Patch('billing-letters/:id/update-status')
  @RequirePermissions('billing-letters:update')
  async updateBillingLetterStatus(@Param('id') id: string) {
    return this.billingLetterService.updateStatus(id);
  }

  @Delete('billing-letters/:id')
  @RequirePermissions('billing-letters:update')
  async deleteBillingLetter(@Param('id') id: string) {
    await this.billingLetterService.delete(id);
    return { success: true };
  }

  // ==================== Invoice Payment History ====================

  @Get('ar-invoices/:id/payment-history')
  @RequirePermissions('ar-subsidiary-ledger:read')
  async getArInvoicePaymentHistory(@Param('id') id: string) {
    const balance = await this.subsidiaryLedgerService.getArInvoiceBalance(id);
    const ledger = await this.subsidiaryLedgerService.getArLedger({
      invoiceId: id,
      limit: 100,
    });
    return { balance, entries: ledger.data };
  }

  @Get('ap-invoices/:id/payment-history')
  @RequirePermissions('ap-subsidiary-ledger:read')
  async getApInvoicePaymentHistory(@Param('id') id: string) {
    const balance = await this.subsidiaryLedgerService.getApInvoiceBalance(id);
    const ledger = await this.subsidiaryLedgerService.getApLedger({
      invoiceId: id,
      limit: 100,
    });
    return { balance, entries: ledger.data };
  }

  // ==================== Spendings ====================

  @Get('spendings')
  @RequirePermissions('spendings:read')
  async getSpendings(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.spendingService.findAll({
      search,
      category,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('spendings/:id')
  @RequirePermissions('spendings:read')
  async getSpending(@Param('id') id: string) {
    return this.spendingService.findById(id);
  }

  @Post('spendings')
  @RequirePermissions('spendings:create')
  async createSpending(@Body() dto: CreateSpendingHttpDto) {
    return this.spendingService.create(dto);
  }

  @Put('spendings/:id')
  @RequirePermissions('spendings:update')
  async updateSpending(
    @Param('id') id: string,
    @Body() dto: UpdateSpendingHttpDto,
  ) {
    return this.spendingService.update(id, dto);
  }

  @Delete('spendings/:id')
  @RequirePermissions('spendings:delete')
  async deleteSpending(@Param('id') id: string) {
    await this.spendingService.delete(id);
    return { success: true };
  }

  @Post('spendings/:id/post-to-gl')
  @RequirePermissions('spendings:update')
  async postSpendingToGL(@Param('id') id: string) {
    return this.spendingService.postToGL(id);
  }
}
