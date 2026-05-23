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
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { EMPLOYEE_SERVICE } from '../../../application/ports/employee-service.port'
import type { EmployeeServicePort } from '../../../application/ports/employee-service.port'
import { ATTENDANCE_SERVICE } from '../../../application/ports/attendance-service.port'
import type { AttendanceServicePort } from '../../../application/ports/attendance-service.port'
import { PAYROLL_SERVICE } from '../../../application/ports/payroll-service.port'
import type { PayrollServicePort } from '../../../application/ports/payroll-service.port'
import { PAYSLIP_SERVICE } from '../../../application/ports/payslip-service.port'
import type { PaySlipServicePort } from '../../../application/ports/payslip-service.port'
import { BPJS_SERVICE } from '../../../application/ports/bpjs-service.port'
import type { BpjsServicePort } from '../../../application/ports/bpjs-service.port'
import { THR_SERVICE } from '../../../application/ports/thr-service.port'
import type { ThrServicePort } from '../../../application/ports/thr-service.port'

@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrController {
  constructor(
    @Inject(EMPLOYEE_SERVICE)
    private readonly employeeService: EmployeeServicePort,
    @Inject(ATTENDANCE_SERVICE)
    private readonly attendanceService: AttendanceServicePort,
    @Inject(PAYROLL_SERVICE)
    private readonly payrollService: PayrollServicePort,
    @Inject(PAYSLIP_SERVICE)
    private readonly paySlipService: PaySlipServicePort,
    @Inject(BPJS_SERVICE)
    private readonly bpjsService: BpjsServicePort,
    @Inject(THR_SERVICE)
    private readonly thrService: ThrServicePort,
  ) {}

  // ==================== Employees ====================

  @Get('employees')
  @RequirePermissions('employees:read')
  async getEmployees(
    @Query('search') search?: string,
    @Query('employment_type') employmentType?: string,
    @Query('site_id') siteId?: string,
    @Query('department_id') departmentId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employeeService.findAll({
      search,
      employmentType: employmentType as any,
      siteId,
      departmentId,
      status: status as any,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('employees/:id')
  @RequirePermissions('employees:read')
  async getEmployee(@Param('id') id: string) {
    return this.employeeService.findById(id)
  }

  @Post('employees')
  @RequirePermissions('employees:create', 'employees:write')
  async createEmployee(@Body() body: any) {
    return this.employeeService.create(body)
  }

  @Put('employees/:id')
  @RequirePermissions('employees:update', 'employees:write')
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.employeeService.update(id, body)
  }

  @Post('employees/:id/documents')
  @RequirePermissions('employees:update', 'employees:write')
  async uploadDocument(@Param('id') id: string, @Body() body: any) {
    return this.employeeService.uploadDocument(id, body)
  }

  @Get('employees/:id/documents')
  @RequirePermissions('employees:read')
  async getDocuments(@Param('id') id: string) {
    return this.employeeService.getDocuments(id)
  }

  @Get('employees/:id/history')
  @RequirePermissions('employees:read')
  async getHistory(@Param('id') id: string) {
    return this.employeeService.getHistory(id)
  }

  // ==================== Attendance ====================

  @Get('attendance/grid')
  @RequirePermissions('attendance:read')
  async getAttendanceGrid(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('site_id') siteId?: string,
    @Query('department_id') departmentId?: string,
  ) {
    return this.attendanceService.getMonthlyGrid(
      parseInt(month, 10),
      parseInt(year, 10),
      siteId,
      departmentId,
    )
  }

  @Get('attendance/summary')
  @RequirePermissions('attendance:read')
  async getAttendanceSummary(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('site_id') siteId?: string,
    @Query('department_id') departmentId?: string,
  ) {
    return this.attendanceService.getSummary(
      parseInt(month, 10),
      parseInt(year, 10),
      siteId,
      departmentId,
    )
  }

  @Post('attendance')
  @RequirePermissions('attendance:create', 'attendance:write')
  async recordAttendance(@Body() body: any) {
    return this.attendanceService.recordAttendance(body)
  }

  @Post('attendance/import')
  @RequirePermissions('attendance:create', 'attendance:write')
  async importAttendance(@Body() body: { lines: any[] }) {
    return this.attendanceService.importCsv(body.lines)
  }

  @Get('attendance/report/export')
  @RequirePermissions('attendance:read')
  async exportAttendanceReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.attendanceService.exportReport(
      parseInt(month, 10),
      parseInt(year, 10),
    )
    const filename = `attendance-${year}-${month.padStart(2, '0')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  // ==================== Payroll ====================

  @Get('payroll')
  @RequirePermissions('payroll:read')
  async getPayrollRuns(
    @Query('year') year?: string,
    @Query('status') status?: string,
  ) {
    return this.payrollService.getPayrollRuns({ year: year ? parseInt(year, 10) : undefined, status })
  }

  @Get('payroll/:id')
  @RequirePermissions('payroll:read')
  async getPayrollRun(@Param('id') id: string) {
    return this.payrollService.getPayrollRun(id)
  }

  @Post('payroll/run')
  @RequirePermissions('payroll:create', 'payroll:write')
  async runPayroll(@Body() body: { month: number; year: number }) {
    return this.payrollService.runPayroll(body.month, body.year)
  }

  @Patch('payroll/:id/confirm')
  @RequirePermissions('payroll:update', 'payroll:write')
  async confirmPayroll(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.payrollService.confirmPayroll(id, userId)
  }

  @Post('payroll/:id/post-to-gl')
  @RequirePermissions('payroll:update', 'payroll:write')
  async postPayrollToGL(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.payrollService.postToGL(id, userId)
  }

  // ==================== Pay Slips ====================

  @Post('payroll/:id/generate-payslips')
  @RequirePermissions('payroll:create', 'payroll:write')
  async generatePaySlips(@Param('id') id: string) {
    return this.paySlipService.generatePaySlips(id)
  }

  @Get('payroll/:id/payslips/:employeeId/download')
  @RequirePermissions('payroll:read')
  async downloadPaySlip(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.paySlipService.getPaySlip(id, employeeId)
    const csv = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const filename = `payslip-${employeeId}-${id}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  @Get('payroll/:id/payslips/download-all')
  @RequirePermissions('payroll:read')
  async downloadAllPaySlips(
    @Param('id') id: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.paySlipService.downloadAll(id)
    const filename = `payslips-all-${id}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(data, 'utf-8'))
  }

  // ==================== BPJS Report ====================

  @Get('bpjs-report')
  @RequirePermissions('payroll:read')
  async getBpjsReport(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.bpjsService.generateReport(parseInt(month, 10), parseInt(year, 10))
  }

  @Get('bpjs-report/export')
  @RequirePermissions('payroll:read')
  async exportBpjsReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.bpjsService.exportReport(parseInt(month, 10), parseInt(year, 10))
    const filename = `bpjs-report-${year}-${month.padStart(2, '0')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return new StreamableFile(Buffer.from(csv, 'utf-8'))
  }

  // ==================== THR ====================

  @Get('thr')
  @RequirePermissions('payroll:read')
  async getThrRecords(@Query('year') year: string) {
    return this.thrService.getRecords(parseInt(year, 10))
  }

  @Post('thr/calculate')
  @RequirePermissions('payroll:create', 'payroll:write')
  async calculateThr(@Query('year') year: string) {
    return this.thrService.calculate(parseInt(year, 10))
  }

  @Post('thr/:id/confirm')
  @RequirePermissions('payroll:update', 'payroll:write')
  async confirmThr(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.thrService.confirm(id, userId)
  }
}
