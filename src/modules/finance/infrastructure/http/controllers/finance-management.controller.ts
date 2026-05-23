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
import type { CreateInvoiceDto, RecordPaymentDto } from '../../../application/services/ar-invoice.service'
import type { CreateAPInvoiceDto, SchedulePaymentDto, BulkPaymentDto } from '../../../application/services/ap-invoice.service'
import type { ImportStatementDto, ManualMatchDto } from '../../../application/services/bank-reconciliation.service'

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceManagementController {
  constructor(
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
  ) {}

  // ==================== Chart of Accounts ====================

  @Get('accounts')
  @RequirePermissions('finance:read')
  async getAccounts(@Query('format') format?: string) {
    if (format === 'flat') {
      return this.accountService.getActiveAccounts()
    }
    return this.accountService.getAccountTree()
  }

  @Post('accounts')
  @RequirePermissions('finance:create', 'finance:write')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountService.createAccount(dto)
  }

  @Put('accounts/:id')
  @RequirePermissions('finance:update', 'finance:write')
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountService.updateAccount(id, dto)
  }

  @Patch('accounts/:id/deactivate')
  @RequirePermissions('finance:delete', 'finance:write')
  async deactivateAccount(@Param('id') id: string) {
    return this.accountService.deactivateAccount(id)
  }

  // ==================== Journal Entries ====================

  @Get('journal-entries')
  @RequirePermissions('finance:read')
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
  @RequirePermissions('finance:read')
  async getJournalEntry(@Param('id') id: string) {
    return this.journalEntryService.findById(id)
  }

  @Post('journal-entries')
  @RequirePermissions('finance:create', 'finance:write')
  async createJournalEntry(
    @Body() body: CreateJournalEntryDto & { submitForApproval?: boolean },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.create(body, userId, !body.submitForApproval)
  }

  @Patch('journal-entries/:id/submit')
  @RequirePermissions('finance:update', 'finance:write')
  async submitJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.submit(id, userId)
  }

  @Patch('journal-entries/:id/approve')
  @RequirePermissions('finance:update', 'finance:write')
  async approveJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.approve(id, userId)
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermissions('finance:delete', 'finance:write')
  async reverseJournalEntry(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.journalEntryService.reverse(id, userId)
  }

  // ==================== AR Invoices ====================

  @Get('invoices')
  @RequirePermissions('invoices:read')
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
  @RequirePermissions('invoices:read')
  async getInvoice(@Param('id') id: string) {
    return this.arInvoiceService.findById(id)
  }

  @Post('invoices')
  @RequirePermissions('invoices:create', 'invoices:write')
  async createInvoice(@Body() body: CreateInvoiceDto & { asDraft?: boolean }) {
    return this.arInvoiceService.create(body, body.asDraft !== false)
  }

  @Post('invoices/:id/send')
  @RequirePermissions('invoices:update', 'invoices:write')
  async sendInvoice(@Param('id') id: string) {
    return this.arInvoiceService.send(id)
  }

  @Post('invoices/:id/record-payment')
  @RequirePermissions('finance:update', 'finance:write')
  async recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.arInvoiceService.recordPayment(id, dto)
  }

  // ==================== AP Invoices ====================

  @Get('supplier-invoices')
  @RequirePermissions('invoices:read')
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
  @RequirePermissions('invoices:read')
  async getSupplierInvoice(@Param('id') id: string) {
    return this.apInvoiceService.findById(id)
  }

  @Post('supplier-invoices')
  @RequirePermissions('invoices:create', 'invoices:write')
  async createSupplierInvoice(@Body() dto: CreateAPInvoiceDto) {
    return this.apInvoiceService.create(dto)
  }

  @Post('ap-invoices/:id/schedule-payment')
  @RequirePermissions('finance:update', 'finance:write')
  async schedulePayment(@Param('id') id: string, @Body() dto: SchedulePaymentDto) {
    return this.apInvoiceService.schedulePayment(id, dto)
  }

  @Post('ap-payments/bulk')
  @RequirePermissions('finance:update', 'finance:write')
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
  @RequirePermissions('finance:read')
  async getBankAccounts() {
    return this.reconciliationService.getBankAccounts()
  }

  @Post('reconciliation/import')
  @RequirePermissions('finance:create', 'finance:write')
  async importStatement(@Body() dto: ImportStatementDto, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.reconciliationService.importStatement(dto, userId)
  }

  @Post('reconciliation/:id/auto-match')
  @RequirePermissions('finance:update', 'finance:write')
  async autoMatch(@Param('id') id: string) {
    return this.reconciliationService.autoMatch(id)
  }

  @Post('reconciliation/:id/manual-match')
  @RequirePermissions('finance:update', 'finance:write')
  async manualMatch(@Param('id') id: string, @Body() dto: ManualMatchDto) {
    return this.reconciliationService.manualMatch(id, dto)
  }

  @Post('reconciliation/:id/finalize')
  @RequirePermissions('finance:update', 'finance:write')
  async finalizeReconciliation(@Param('id') id: string) {
    return this.reconciliationService.finalize(id)
  }

  @Get('reconciliation/:id/report')
  @RequirePermissions('finance:read')
  async getReconciliationReport(@Param('id') id: string) {
    return this.reconciliationService.getReport(id)
  }

  // ==================== Financial Statements ====================

  @Get('reports/financial-statements/:type')
  @RequirePermissions('reports:read')
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
  @RequirePermissions('reports:read')
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
}
