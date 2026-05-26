import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  Res,
  StreamableFile,
  Req,
  Inject,
} from '@nestjs/common'
import type { Response, Request } from 'express'
import { DataSource } from 'typeorm'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { ACCOUNT_SERVICE } from '../../../application/ports/account-service.port'
import type { AccountServicePort } from '../../../application/ports/account-service.port'
import { JOURNAL_ENTRY_SERVICE } from '../../../application/ports/journal-entry-service.port'
import type { JournalEntryServicePort } from '../../../application/ports/journal-entry-service.port'
import { AR_INVOICE_SERVICE } from '../../../application/ports/ar-invoice-service.port'
import type { ARInvoiceServicePort } from '../../../application/ports/ar-invoice-service.port'
import { AP_INVOICE_SERVICE } from '../../../application/ports/ap-invoice-service.port'
import type { APInvoiceServicePort } from '../../../application/ports/ap-invoice-service.port'
import { TAX_SERVICE } from '../../../application/ports/tax-service.port'
import type { TaxServicePort } from '../../../application/ports/tax-service.port'
import { BANK_RECONCILIATION_SERVICE } from '../../../application/ports/bank-reconciliation-service.port'
import type { BankReconciliationServicePort } from '../../../application/ports/bank-reconciliation-service.port'
import { FINANCIAL_STATEMENTS_SERVICE } from '../../../application/ports/financial-statements-service.port'
import type { FinancialStatementsServicePort } from '../../../application/ports/financial-statements-service.port'
import type { CreateAccountDto, UpdateAccountDto } from '../../../application/services/account.service'
import type { CreateJournalEntryDto } from '../../../application/services/journal-entry.service'
import type { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto } from '../../../application/services/ar-invoice.service'
import type { CreateAPInvoiceDto, SchedulePaymentDto, BulkPaymentDto } from '../../../application/services/ap-invoice.service'
import type { ImportStatementDto, ManualMatchDto } from '../../../application/services/bank-reconciliation.service'
import { GL_POSTING_QUEUE_SERVICE } from '../../../application/ports/gl-posting-queue-service.port'
import type { GlPostingQueueServicePort } from '../../../application/ports/gl-posting-queue-service.port'
import type { PostToJournalDto } from '../../../application/services/gl-posting-queue.service'

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
  ) {}

  // ==================== Chart of Accounts ====================

  @Get('accounts')
  @RequirePermissions('chart-of-accounts:read')
  async getAccounts(@Query('format') format?: string) {
    if (format === 'flat') {
      return this.accountService.getActiveAccounts()
    }
    return this.accountService.getAccountTree()
  }

  @Post('accounts')
  @RequirePermissions('chart-of-accounts:create')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountService.createAccount(dto)
  }

  @Put('accounts/:id')
  @RequirePermissions('chart-of-accounts:update')
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountService.updateAccount(id, dto)
  }

  @Patch('accounts/:id/deactivate')
  @RequirePermissions('chart-of-accounts:delete')
  async deactivateAccount(@Param('id') id: string) {
    return this.accountService.deactivateAccount(id)
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
    })
  }

  @Get('journal-entries/:id')
  @RequirePermissions('journal-entries:read')
  async getJournalEntry(@Param('id') id: string) {
    const result = await this.journalEntryService.findById(id)
    if (!result) return null

    const entry = result.entry as any
    entry.createdByName = await this.resolveUserName(entry.createdBy)
    entry.approvedByName = entry.approvedBy ? await this.resolveUserName(entry.approvedBy) : null

    if (entry.sourceType && entry.sourceId) {
      try {
        const table = entry.sourceType === 'sales_invoice' ? 'ar_invoices' : 'ap_invoices'
        const field = entry.sourceType === 'sales_invoice' ? 'invoice_number' : 'invoice_number'
        const rows = await this.dataSource.query(
          `SELECT ${field} FROM ${table} WHERE id = $1 LIMIT 1`,
          [entry.sourceId],
        )
        if (rows.length > 0) {
          entry.sourceNumber = rows[0][field]
        }
      } catch {}
    }

    return result
  }

  private async resolveUserName(userId: string): Promise<string> {
    if (!userId || userId === 'unknown' || userId === 'system') return userId
    try {
      const rows = await this.dataSource.query(
        `SELECT first_name, last_name FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      )
      if (rows.length > 0) {
        return `${rows[0].first_name} ${rows[0].last_name}`.trim()
      }
    } catch {}
    return userId
  }

  @Post('journal-entries')
  @RequirePermissions('journal-entries:create')
  async createJournalEntry(
    @Body() body: CreateJournalEntryDto & { submitForApproval?: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.create(body, userId, !body.submitForApproval)
  }

  @Patch('journal-entries/:id/submit')
  @RequirePermissions('journal-entries:update')
  async submitJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.submit(id, userId)
  }

  @Patch('journal-entries/:id/approve')
  @RequirePermissions('journal-entries:approve')
  async approveJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.approve(id, userId)
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermissions('journal-entries:update')
  async reverseJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.reverse(id, userId)
  }

  // ==================== AR Invoices ====================

  @Get('invoices')
  @RequirePermissions('sales-invoices:read')
  async getInvoices(
    @Query('status') status?: string,
    @Query('client_id') clientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.arInvoiceService.findAll({
      status,
      clientId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('invoices/:id')
  @RequirePermissions('sales-invoices:read')
  async getInvoice(@Param('id') id: string) {
    return this.arInvoiceService.findById(id)
  }

  @Post('invoices')
  @RequirePermissions('sales-invoices:create')
  async createInvoice(@Body() body: CreateInvoiceDto & { asDraft?: boolean }) {
    return this.arInvoiceService.create(body, body.asDraft !== false)
  }

  @Put('invoices/:id')
  @RequirePermissions('sales-invoices:update')
  async updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.arInvoiceService.update(id, dto)
  }

  @Post('invoices/:id/send')
  @RequirePermissions('sales-invoices:update')
  async sendInvoice(@Param('id') id: string) {
    return this.arInvoiceService.send(id)
  }

  @Post('invoices/:id/record-payment')
  @RequirePermissions('sales-invoices:update')
  async recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.arInvoiceService.recordPayment(id, dto)
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
    })
  }

  @Get('supplier-invoices/:id')
  @RequirePermissions('supplier-invoices:read')
  async getSupplierInvoice(@Param('id') id: string) {
    return this.apInvoiceService.findById(id)
  }

  @Post('supplier-invoices')
  @RequirePermissions('supplier-invoices:create')
  async createSupplierInvoice(@Body() dto: CreateAPInvoiceDto) {
    return this.apInvoiceService.create(dto)
  }

  @Post('ap-invoices/:id/schedule-payment')
  @RequirePermissions('supplier-invoices:update')
  async schedulePayment(@Param('id') id: string, @Body() dto: SchedulePaymentDto) {
    return this.apInvoiceService.schedulePayment(id, dto)
  }

  @Post('ap-payments/bulk')
  @RequirePermissions('supplier-invoices:update')
  async bulkPayment(@Body() dto: BulkPaymentDto) {
    return this.apInvoiceService.bulkPayment(dto)
  }

  // ==================== Tax / e-Faktur ====================

  @Get('tax/ppn')
  @RequirePermissions('tax:read')
  async getTaxReport(@Query('month') month: string, @Query('year') year: string) {
    return this.taxService.getMonthlyReport(parseInt(month, 10), parseInt(year, 10))
  }

  @Get('tax/ppn/export/csv')
  @RequirePermissions('tax:read')
  async exportTaxCsv(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.taxService.exportCsv(parseInt(month, 10), parseInt(year, 10))
    const filename = `e-faktur-${year}-${month.padStart(2, '0')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  @Get('tax/ppn/export/pdf')
  @RequirePermissions('tax:read')
  async exportTaxPdf(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const content = await this.taxService.exportPdf(parseInt(month, 10), parseInt(year, 10))
    const filename = `ppn-report-${year}-${month.padStart(2, '0')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(content, 'utf-8'))
  }

  // ==================== Bank Reconciliation ====================

  @Get('reconciliation/bank-accounts')
  @RequirePermissions('bank-reconciliation:read')
  async getBankAccounts() {
    return this.reconciliationService.getBankAccounts()
  }

  @Post('reconciliation/import')
  @RequirePermissions('bank-reconciliation:create')
  async importStatement(@Body() dto: ImportStatementDto, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.reconciliationService.importStatement(dto, userId)
  }

  @Post('reconciliation/:id/auto-match')
  @RequirePermissions('bank-reconciliation:update')
  async autoMatch(@Param('id') id: string) {
    return this.reconciliationService.autoMatch(id)
  }

  @Post('reconciliation/:id/manual-match')
  @RequirePermissions('bank-reconciliation:update')
  async manualMatch(@Param('id') id: string, @Body() dto: ManualMatchDto) {
    return this.reconciliationService.manualMatch(id, dto)
  }

  @Post('reconciliation/:id/finalize')
  @RequirePermissions('bank-reconciliation:update')
  async finalizeReconciliation(@Param('id') id: string) {
    return this.reconciliationService.finalize(id)
  }

  @Get('reconciliation/:id/report')
  @RequirePermissions('bank-reconciliation:read')
  async getReconciliationReport(@Param('id') id: string) {
    return this.reconciliationService.getReport(id)
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
    const now = new Date()
    const from = dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = dateTo ?? now.toISOString().split('T')[0]

    switch (type) {
      case 'profit-loss':
        return this.financialStatementsService.getProfitLoss(from, to, comparePrior === 'true')
      case 'balance-sheet':
        return this.financialStatementsService.getBalanceSheet(to)
      case 'cash-flow':
        return this.financialStatementsService.getCashFlow(from, to)
      default:
        return { error: 'Invalid statement type. Use: profit-loss, balance-sheet, or cash-flow' }
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
    const now = new Date()
    const from = dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = dateTo ?? now.toISOString().split('T')[0]

    const csv = await this.financialStatementsService.exportCsv(type, from, to)
    const filename = `${type}-${from}-to-${to}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(csv, 'utf-8'))
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
    })
  }

  @Get('gl-posting-queue/:id')
  @RequirePermissions('gl-posting-queue:read')
  async getGlPostingQueueItem(@Param('id') id: string) {
    return this.glPostingQueueService.findById(id)
  }

  @Post('gl-posting-queue/:id/post')
  @RequirePermissions('gl-posting-queue:create')
  async postGlQueueToJournal(
    @Param('id') id: string,
    @Body() dto: PostToJournalDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.glPostingQueueService.postToJournal(id, dto, userId)
  }

  @Patch('gl-posting-queue/:id/cancel')
  @RequirePermissions('gl-posting-queue:create')
  async cancelGlPostingQueueItem(@Param('id') id: string) {
    await this.glPostingQueueService.cancel(id)
    return { success: true }
  }
}
