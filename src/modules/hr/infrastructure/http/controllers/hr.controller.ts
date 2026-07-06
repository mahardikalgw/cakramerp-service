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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { EMPLOYEE_SERVICE } from '../../../application/ports/employee-service.port';
import type { EmployeeServicePort } from '../../../application/ports/employee-service.port';
import { ATTENDANCE_SERVICE } from '../../../application/ports/attendance-service.port';
import type { AttendanceServicePort } from '../../../application/ports/attendance-service.port';
import { PAYROLL_SERVICE } from '../../../application/ports/payroll-service.port';
import type { PayrollServicePort } from '../../../application/ports/payroll-service.port';
import { PAYSLIP_SERVICE } from '../../../application/ports/payslip-service.port';
import type { PaySlipServicePort } from '../../../application/ports/payslip-service.port';
import { BPJS_SERVICE } from '../../../application/ports/bpjs-service.port';
import type { BpjsServicePort } from '../../../application/ports/bpjs-service.port';
import { THR_SERVICE } from '../../../application/ports/thr-service.port';
import type { ThrServicePort } from '../../../application/ports/thr-service.port';
import { DEPARTMENT_SERVICE } from '../../../application/ports/department-service.port';
import type { DepartmentServicePort } from '../../../application/ports/department-service.port';
import { POSITION_SERVICE } from '../../../application/ports/position-service.port';
import type { PositionServicePort } from '../../../application/ports/position-service.port';
import { PAYROLL_QUEUE_NAME } from '../../../../../queues/payroll.constants';

import { CreateEmployeeCommand } from '../../../application/commands/create-employee.command';
import { UpdateEmployeeCommand } from '../../../application/commands/update-employee.command';
import { RecordAttendanceCommand } from '../../../application/commands/record-attendance.command';
import { ImportAttendanceCommand } from '../../../application/commands/import-attendance.command';
import { RunPayrollCommand } from '../../../application/commands/run-payroll.command';
import { CalculateThrCommand } from '../../../application/commands/calculate-thr.command';
import { CreateDepartmentCommand } from '../../../application/commands/create-department.command';
import { UpdateDepartmentCommand } from '../../../application/commands/update-department.command';
import { CreatePositionCommand } from '../../../application/commands/create-position.command';
import { UpdatePositionCommand } from '../../../application/commands/update-position.command';

import {
  CreateEmployeeHttpDto,
  UpdateEmployeeHttpDto,
} from '../dtos/employee.dto';
import {
  RecordAttendanceHttpDto,
  ImportAttendanceHttpDto,
} from '../dtos/attendance.dto';
import { RunPayrollHttpDto } from '../dtos/payroll.dto';
import {
  CreateDepartmentHttpDto,
  UpdateDepartmentHttpDto,
} from '../dtos/department.dto';
import {
  CreatePositionHttpDto,
  UpdatePositionHttpDto,
} from '../dtos/position.dto';

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
    @Inject(DEPARTMENT_SERVICE)
    private readonly departmentService: DepartmentServicePort,
    @Inject(POSITION_SERVICE)
    private readonly positionService: PositionServicePort,
    @InjectQueue(PAYROLL_QUEUE_NAME)
    private readonly payrollQueue: Queue,
  ) {}

  // ==================== Departments ====================

  @Get('departments')
  @RequirePermissions('departments:read')
  async getDepartments(
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.departmentService.findAll({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('departments/:id')
  @RequirePermissions('departments:read')
  async getDepartment(@Param('id') id: string) {
    return this.departmentService.findById(id);
  }

  @Post('departments')
  @RequirePermissions('departments:create')
  async createDepartment(@Body() dto: CreateDepartmentHttpDto) {
    const command = new CreateDepartmentCommand(dto.name, dto.description);
    return this.departmentService.create(command);
  }

  @Put('departments/:id')
  @RequirePermissions('departments:update')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentHttpDto,
  ) {
    const command = new UpdateDepartmentCommand(
      dto.name,
      dto.description,
      dto.isActive,
    );
    return this.departmentService.update(id, command);
  }

  @Delete('departments/:id')
  @RequirePermissions('departments:delete')
  async deleteDepartment(@Param('id') id: string) {
    return this.departmentService.delete(id);
  }

  // ==================== Positions ====================

  @Get('positions')
  @RequirePermissions('positions:read')
  async getPositions(
    @Query('search') search?: string,
    @Query('department_id') departmentId?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.positionService.findAll({
      search,
      departmentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('positions/:id')
  @RequirePermissions('positions:read')
  async getPosition(@Param('id') id: string) {
    return this.positionService.findById(id);
  }

  @Post('positions')
  @RequirePermissions('positions:create')
  async createPosition(@Body() dto: CreatePositionHttpDto) {
    const command = new CreatePositionCommand(
      dto.name,
      dto.departmentId,
      dto.description,
    );
    return this.positionService.create(command);
  }

  @Put('positions/:id')
  @RequirePermissions('positions:update')
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionHttpDto,
  ) {
    const command = new UpdatePositionCommand(
      dto.name,
      dto.departmentId,
      dto.description,
      dto.isActive,
    );
    return this.positionService.update(id, command);
  }

  @Delete('positions/:id')
  @RequirePermissions('positions:delete')
  async deletePosition(@Param('id') id: string) {
    return this.positionService.delete(id);
  }

  // ==================== Employees ====================

  @Get('employees')
  @RequirePermissions('employees:read')
  async getEmployees(
    @Query('search') search?: string,
    @Query('employment_type') employmentType?: string,
    @Query('department_id') departmentId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employeeService.findAll({
      search,
      employmentType: employmentType as any,
      departmentId,
      status: status as any,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('employees/:id')
  @RequirePermissions('employees:read')
  async getEmployee(@Param('id') id: string) {
    return this.employeeService.findById(id);
  }

  @Post('employees')
  @RequirePermissions('employees:create')
  async createEmployee(@Body() dto: CreateEmployeeHttpDto) {
    const command = new CreateEmployeeCommand(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.phone,
      dto.employmentType,
      dto.departmentId,
      dto.positionId,
      dto.baseSalary,
      dto.hireDate,
      dto.workStartTime,
      dto.workEndTime,
      dto.breakDurationMinutes,
      dto.username,
    );
    return this.employeeService.create(command);
  }

  @Put('employees/:id')
  @RequirePermissions('employees:update')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeHttpDto,
  ) {
    const command = new UpdateEmployeeCommand(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.phone,
      dto.employmentType,
      dto.departmentId,
      dto.positionId,
      dto.baseSalary,
      dto.hireDate,
      dto.status,
      dto.workStartTime,
      dto.workEndTime,
      dto.breakDurationMinutes,
      dto.username,
    );
    return this.employeeService.update(id, command);
  }

  @Post('employees/:id/documents')
  @RequirePermissions('employees:update')
  async uploadDocument(@Param('id') id: string, @Body() body: any) {
    return this.employeeService.uploadDocument(id, body);
  }

  @Get('employees/:id/documents')
  @RequirePermissions('employees:read')
  async getDocuments(@Param('id') id: string) {
    return this.employeeService.getDocuments(id);
  }

  @Get('employees/:id/history')
  @RequirePermissions('employees:read')
  async getHistory(@Param('id') id: string) {
    return this.employeeService.getHistory(id);
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
    );
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
    );
  }

  @Post('attendance')
  @RequirePermissions('attendance:create')
  async recordAttendance(@Body() dto: RecordAttendanceHttpDto) {
    const command = new RecordAttendanceCommand(
      dto.employeeId,
      dto.date,
      dto.clockIn,
      dto.clockOut,
      dto.status,
      dto.notes,
    );
    return this.attendanceService.recordAttendance(command);
  }

  @Post('attendance/import')
  @RequirePermissions('attendance:create')
  async importAttendance(@Body() dto: ImportAttendanceHttpDto) {
    const command = new ImportAttendanceCommand(dto.lines);
    return this.attendanceService.importCsv(command.lines);
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
    );
    const filename = `attendance-${year}-${month.padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  // ==================== Payroll ====================

  @Get('payroll')
  @RequirePermissions('payroll:read')
  async getPayrollRuns(
    @Query('year') year?: string,
    @Query('status') status?: string,
  ) {
    return this.payrollService.getPayrollRuns({
      year: year ? parseInt(year, 10) : undefined,
      status,
    });
  }

  @Get('payroll/:id')
  @RequirePermissions('payroll:read')
  async getPayrollRun(@Param('id') id: string) {
    return this.payrollService.getPayrollRun(id);
  }

  @Post('payroll/run')
  @RequirePermissions('payroll:create')
  async runPayroll(@Body() dto: RunPayrollHttpDto, @Req() req: any) {
    const command = new RunPayrollCommand(dto.month, dto.year);
    const job = await this.payrollQueue.add('run-payroll', {
      month: command.month,
      year: command.year,
      requestedBy: req.user?.id ?? 'unknown',
    });
    return {
      status: 'queued',
      jobId: job.id,
      message: `Payroll for ${command.month}/${command.year} has been queued for processing`,
    };
  }

  @Patch('payroll/:id/confirm')
  @RequirePermissions('payroll:approve')
  async confirmPayroll(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.payrollService.confirmPayroll(id, userId);
  }

  @Post('payroll/:id/post-to-gl')
  @RequirePermissions('payroll:update')
  async postPayrollToGL(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.payrollService.postToGL(id, userId);
  }

  // ==================== Pay Slips ====================

  @Post('payroll/:id/generate-payslips')
  @RequirePermissions('payroll:create')
  async generatePaySlips(@Param('id') id: string) {
    return this.paySlipService.generatePaySlips(id);
  }

  @Get('payroll/:id/payslips/:employeeId/download')
  @RequirePermissions('payroll:read')
  async downloadPaySlip(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.paySlipService.getPaySlip(id, employeeId);
    const csv = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const filename = `payslip-${employeeId}-${id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Get('payroll/:id/payslips/download-all')
  @RequirePermissions('payroll:read')
  async downloadAllPaySlips(
    @Param('id') id: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const data = await this.paySlipService.downloadAll(id);
    const filename = `payslips-all-${id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(data, 'utf-8'));
  }

  // ==================== BPJS Report ====================

  @Get('bpjs-report')
  @RequirePermissions('bpjs-report:read')
  async getBpjsReport(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.bpjsService.generateReport(
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('bpjs-report/export')
  @RequirePermissions('bpjs-report:read')
  async exportBpjsReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.bpjsService.exportReport(
      parseInt(month, 10),
      parseInt(year, 10),
    );
    const filename = `bpjs-report-${year}-${month.padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  // ==================== THR ====================

  @Get('thr')
  @RequirePermissions('thr:read')
  async getThrRecords(@Query('year') year: string) {
    return this.thrService.getRecords(parseInt(year, 10));
  }

  @Post('thr/calculate')
  @RequirePermissions('thr:create')
  async calculateThr(@Query('year') year: string) {
    const command = new CalculateThrCommand(parseInt(year, 10));
    return this.thrService.calculate(command.year);
  }

  @Post('thr/:id/confirm')
  @RequirePermissions('thr:update')
  async confirmThr(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.thrService.confirm(id, userId);
  }
}
