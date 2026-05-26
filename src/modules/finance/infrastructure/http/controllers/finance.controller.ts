import {
  Controller,
  Get,
  Query,
  Patch,
  Put,
  Body,
  Param,
  UseGuards,
  Post,
  Res,
  StreamableFile,
  Inject,
} from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { FINANCE_SERVICE } from '../../../application/ports/finance-service.port'
import type { FinanceServicePort } from '../../../application/ports/finance-service.port'

const KPI_CACHE_KEY = 'finance:dashboard:kpis'
const KPI_CACHE_TTL = 60 * 1000 // 60 seconds in ms

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(
    @Inject(FINANCE_SERVICE)
    private readonly financeService: FinanceServicePort,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get('dashboard/kpis')
  @RequirePermissions('dashboard:read')
  async getKpis() {
    const cached = await this.cacheManager.get(KPI_CACHE_KEY)
    if (cached) return cached

    try {
      const data = await this.financeService.getKpiData()
      await this.cacheManager.set(KPI_CACHE_KEY, data, KPI_CACHE_TTL)
      return data
    } catch {
      // Return default KPIs if data is not available yet
      return {
        revenueMtd: 0,
        expensesMtd: 0,
        netProfit: 0,
        cashPosition: 0,
        outstandingReceivables: 0,
        outstandingPayables: 0,
        avgProjectCompletion: 0,
        revenueChange: 0,
        expensesChange: 0,
        netProfitChange: 0,
      }
    }
  }

  @Get('reports/profit-loss')
  @RequirePermissions('reports:read')
  async getProfitLoss(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('segment') segment?: string,
    @Query('project_id') projectId?: string,
    @Query('cost_center') costCenter?: string,
  ) {
    return this.financeService.getProfitLossReport({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      segment: segment || undefined,
      projectId: projectId || undefined,
      costCenter: costCenter || undefined,
    })
  }

  @Get('reports/profit-loss/export')
  @RequirePermissions('reports:read')
  async exportProfitLoss(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('segment') segment?: string,
    @Query('project_id') projectId?: string,
    @Query('cost_center') costCenter?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.financeService.getProfitLossExportData({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      segment: segment || undefined,
      projectId: projectId || undefined,
      costCenter: costCenter || undefined,
    })

    // Build CSV export (lightweight, no external dependency needed)
    const rows: string[] = []
    rows.push('Line Item,Current Period,Prior Period,Variance (IDR),Variance (%)')
    rows.push('')
    rows.push('--- Revenue ---,,,,')
    for (const item of data.revenue) {
      rows.push(`"${item.label}",${item.currentPeriod},${item.priorPeriod},${item.variance},${item.variancePercent}%`)
    }
    rows.push(`"${data.summary.totalRevenue.label}",${data.summary.totalRevenue.currentPeriod},${data.summary.totalRevenue.priorPeriod},${data.summary.totalRevenue.variance},${data.summary.totalRevenue.variancePercent}%`)
    rows.push('')
    rows.push('--- Cost of Goods Sold ---,,,,')
    for (const item of data.cogs) {
      rows.push(`"${item.label}",${item.currentPeriod},${item.priorPeriod},${item.variance},${item.variancePercent}%`)
    }
    rows.push(`"${data.summary.totalCogs.label}",${data.summary.totalCogs.currentPeriod},${data.summary.totalCogs.priorPeriod},${data.summary.totalCogs.variance},${data.summary.totalCogs.variancePercent}%`)
    rows.push('')
    rows.push(`"${data.summary.grossProfit.label}",${data.summary.grossProfit.currentPeriod},${data.summary.grossProfit.priorPeriod},${data.summary.grossProfit.variance},${data.summary.grossProfit.variancePercent}%`)
    rows.push('')
    rows.push('--- Operating Expenses ---,,,,')
    for (const item of data.operatingExpenses) {
      rows.push(`"${item.label}",${item.currentPeriod},${item.priorPeriod},${item.variance},${item.variancePercent}%`)
    }
    rows.push(`"${data.summary.totalOperatingExpenses.label}",${data.summary.totalOperatingExpenses.currentPeriod},${data.summary.totalOperatingExpenses.priorPeriod},${data.summary.totalOperatingExpenses.variance},${data.summary.totalOperatingExpenses.variancePercent}%`)
    rows.push('')
    rows.push(`"${data.summary.netProfit.label}",${data.summary.netProfit.currentPeriod},${data.summary.netProfit.priorPeriod},${data.summary.netProfit.variance},${data.summary.netProfit.variancePercent}%`)

    const csv = rows.join('\n')
    const filename = `profit-loss-report-${dateFrom || 'all'}-to-${dateTo || 'now'}.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  @Get('reports/cash-flow')
  @RequirePermissions('reports:read')
  async getCashFlow() {
    return this.financeService.getCashFlow()
  }

  @Get('reports/cash-flow/forecast')
  @RequirePermissions('reports:read')
  async getCashFlowForecast() {
    return this.financeService.getCashForecast()
  }

  @Get('reports/receivables-aging')
  @RequirePermissions('reports:read')
  async getReceivablesAging(
    @Query('client_id') clientId?: string,
    @Query('segment') segment?: string,
    @Query('project_id') projectId?: string,
  ) {
    return this.financeService.getReceivablesAging({
      clientId: clientId || undefined,
      segment: segment || undefined,
      projectId: projectId || undefined,
    })
  }

  @Get('reports/receivables-aging/statement-of-account')
  @RequirePermissions('reports:read')
  async getStatementOfAccount(
    @Query('client_id') clientId: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.financeService.getStatementOfAccount(clientId)

    // Generate CSV statement of account
    const rows: string[] = []
    rows.push(`Statement of Account - ${data.clientName}`)
    rows.push(`Generated: ${new Date().toISOString().split('T')[0]}`)
    rows.push('')
    rows.push('Invoice Number,Issue Date,Due Date,Amount,Paid,Balance,Status')
    for (const inv of data.invoices) {
      rows.push(`"${inv.invoiceNumber}",${inv.issueDate},${inv.dueDate},${inv.amount},${inv.paid},${inv.balance},${inv.status}`)
    }
    rows.push('')
    rows.push(`Grand Total,,,,,"${data.grandTotal}",`)

    const csv = rows.join('\n')
    const filename = `statement-of-account-${data.clientName.replace(/\s+/g, '-').toLowerCase()}.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  @Get('alerts')
  @RequirePermissions('dashboard:read')
  async getAlerts() {
    const [all, unread] = await Promise.all([
      this.financeService.getAlerts(),
      this.financeService.getUnreadAlerts(),
    ])
    return { data: all, unreadCount: unread.length }
  }

  @Patch('alerts/:id/dismiss')
  @RequirePermissions('dashboard:read')
  async dismissAlert(@Param('id') id: string) {
    await this.financeService.dismissAlert(id)
    return { message: 'Alert dismissed' }
  }

  @Get('alert-settings')
  @RequirePermissions('settings:read')
  async getAlertSettings() {
    return this.financeService.getAlertSettings()
  }

  @Put('alert-settings')
  @RequirePermissions('settings:update')
  async updateAlertSettings(
    @Body() body: { settings: { alertType: string; value: number }[] },
  ) {
    await this.financeService.updateAlertSettings(body.settings)
    return { message: 'Settings updated' }
  }

  @Post('check-thresholds')
  @RequirePermissions('settings:update')
  async checkThresholds() {
    await this.financeService.checkThresholdsAndCreateAlerts()
    return { message: 'Threshold check completed' }
  }
}
