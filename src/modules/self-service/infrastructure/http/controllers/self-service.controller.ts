import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Query,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { MY_PROFILE_SERVICE } from '../../../application/ports/my-profile-service.port'
import type { MyProfileServicePort } from '../../../application/ports/my-profile-service.port'
import { MY_ATTENDANCE_SERVICE } from '../../../application/ports/my-attendance-service.port'
import type { MyAttendanceServicePort } from '../../../application/ports/my-attendance-service.port'
import { MY_LEAVE_SERVICE } from '../../../application/ports/my-leave-service.port'
import type { MyLeaveServicePort } from '../../../application/ports/my-leave-service.port'
import { MY_PAYSLIP_SERVICE } from '../../../application/ports/my-payslip-service.port'
import type { MyPayslipServicePort } from '../../../application/ports/my-payslip-service.port'
import { MY_SCHEDULE_SERVICE } from '../../../application/ports/my-schedule-service.port'
import type { MyScheduleServicePort } from '../../../application/ports/my-schedule-service.port'
import { MY_OVERTIME_SERVICE } from '../../../application/ports/my-overtime-service.port'
import type { MyOvertimeServicePort } from '../../../application/ports/my-overtime-service.port'
import { MyProfileService } from '../../../application/services/my-profile.service'

import { UpdateProfileCommand } from '../../../application/commands/update-profile.command'

import {
  ApplyLeaveHttpDto,
  UpdateProfileHttpDto,
  CreateChangeRequestHttpDto,
  FlagDiscrepancyHttpDto,
  CreateOvertimeRequestHttpDto,
} from '../dtos/self-service.dto'

@Controller('my')
@UseGuards(JwtAuthGuard)
export class SelfServiceController {
  constructor(
    @Inject(MY_PROFILE_SERVICE)
    private readonly profileService: MyProfileServicePort & { getEmployeeIdFromUserId: (userId: string) => Promise<string> },
    @Inject(MY_ATTENDANCE_SERVICE)
    private readonly attendanceService: MyAttendanceServicePort,
    @Inject(MY_LEAVE_SERVICE)
    private readonly leaveService: MyLeaveServicePort,
    @Inject(MY_PAYSLIP_SERVICE)
    private readonly payslipService: MyPayslipServicePort,
    @Inject(MY_SCHEDULE_SERVICE)
    private readonly scheduleService: MyScheduleServicePort,
    @Inject(MY_OVERTIME_SERVICE)
    private readonly overtimeService: MyOvertimeServicePort,
  ) {}

  private async getEmployeeId(req: any): Promise<string> {
    const userId = req.user.sub ?? req.user.id
    return (this.profileService as MyProfileService).getEmployeeIdFromUserId(userId)
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  async getProfile(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.profileService.getProfile(employeeId)
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileHttpDto) {
    const employeeId = await this.getEmployeeId(req)
    const command = new UpdateProfileCommand(
      dto.fullName,
      dto.phone,
      dto.address,
      dto.bankAccountNumber,
      dto.bankName,
    )
    return this.profileService.updateProfile(employeeId, command)
  }

  @Post('profile/change-requests')
  async createChangeRequest(@Req() req: any, @Body() dto: CreateChangeRequestHttpDto) {
    const employeeId = await this.getEmployeeId(req)
    return this.profileService.createChangeRequest(employeeId, dto)
  }

  @Get('documents')
  async getDocuments(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.profileService.getDocuments(employeeId)
  }

  @Get('documents/:id/download')
  async getDocumentDownloadUrl(@Req() req: any, @Param('id') documentId: string) {
    const employeeId = await this.getEmployeeId(req)
    return { url: await this.profileService.getDocumentDownloadUrl(employeeId, documentId) }
  }

  // ─── Attendance ────────────────────────────────────────────────────────────

  @Get('attendance')
  async getMonthlyAttendance(
    @Req() req: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const employeeId = await this.getEmployeeId(req)
    const m = parseInt(month, 10) || new Date().getMonth() + 1
    const y = parseInt(year, 10) || new Date().getFullYear()
    return this.attendanceService.getMonthlyAttendance(employeeId, m, y)
  }

  @Get('attendance/today')
  async getTodayAttendance(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.attendanceService.getTodayAttendance(employeeId)
  }

  @Post('attendance/clock-in')
  async clockIn(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.attendanceService.clockIn(employeeId)
  }

  @Post('attendance/clock-out')
  async clockOut(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.attendanceService.clockOut(employeeId)
  }

  @Post('attendance/flag-discrepancy')
  async flagDiscrepancy(@Req() req: any, @Body() dto: FlagDiscrepancyHttpDto) {
    const employeeId = await this.getEmployeeId(req)
    return this.attendanceService.flagDiscrepancy(employeeId, { attendanceDate: dto.date, description: dto.reason })
  }

  // ─── Leave ─────────────────────────────────────────────────────────────────

  @Get('leave/balance')
  async getLeaveBalance(@Req() req: any, @Query('year') year: string) {
    const employeeId = await this.getEmployeeId(req)
    const y = parseInt(year, 10) || new Date().getFullYear()
    return this.leaveService.getLeaveBalance(employeeId, y)
  }

  @Get('leave/history')
  async getLeaveHistory(
    @Req() req: any,
    @Query('status') status: string,
    @Query('year') year: string,
  ) {
    const employeeId = await this.getEmployeeId(req)
    const filters: { status?: string; year?: number } = {}
    if (status) filters.status = status
    if (year) filters.year = parseInt(year, 10)
    return this.leaveService.getLeaveHistory(employeeId, filters)
  }

  @Post('leave/apply')
  async applyLeave(@Req() req: any, @Body() dto: ApplyLeaveHttpDto) {
    const employeeId = await this.getEmployeeId(req)
    return this.leaveService.applyLeave(employeeId, {
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason ?? '',
      attachmentPath: dto.attachmentPath,
    })
  }

  @Patch('leave/:id/cancel')
  async cancelLeave(@Req() req: any, @Param('id') leaveRequestId: string) {
    const employeeId = await this.getEmployeeId(req)
    return this.leaveService.cancelLeave(employeeId, leaveRequestId)
  }

  // ─── Payslips ──────────────────────────────────────────────────────────────

  @Get('payslips')
  async getPayslips(@Req() req: any) {
    const employeeId = await this.getEmployeeId(req)
    return this.payslipService.getPayslips(employeeId)
  }

  @Get('payslips/:payrollId/download')
  async downloadPayslip(@Req() req: any, @Param('payrollId') payrollId: string) {
    const employeeId = await this.getEmployeeId(req)
    return { url: await this.payslipService.downloadPayslip(employeeId, payrollId) }
  }

  @Get('tax/ytd-summary')
  async getTaxYtdSummary(@Req() req: any, @Query('year') year: string) {
    const employeeId = await this.getEmployeeId(req)
    const y = parseInt(year, 10) || new Date().getFullYear()
    return this.payslipService.getTaxYtdSummary(employeeId, y)
  }

  @Get('tax/bukti-potong/download')
  async downloadBuktiPotong(@Req() req: any, @Query('year') year: string) {
    const employeeId = await this.getEmployeeId(req)
    const y = parseInt(year, 10) || new Date().getFullYear()
    return { url: await this.payslipService.downloadBuktiPotong(employeeId, y) }
  }

  // ─── Schedule ──────────────────────────────────────────────────────────────

  @Get('schedule')
  async getSchedule(@Req() req: any, @Query('weeks') weeks: string) {
    const employeeId = await this.getEmployeeId(req)
    const w = parseInt(weeks, 10) || 2
    return this.scheduleService.getSchedule(employeeId, w)
  }

  // ─── Overtime ──────────────────────────────────────────────────────────────

  @Get('overtime-requests')
  async getOvertimeRequests(@Req() req: any, @Query('status') status: string) {
    const employeeId = await this.getEmployeeId(req)
    const filters: { status?: string } = {}
    if (status) filters.status = status
    return this.overtimeService.getRequests(employeeId, filters)
  }

  @Post('overtime-requests')
  async createOvertimeRequest(@Req() req: any, @Body() dto: CreateOvertimeRequestHttpDto) {
    const employeeId = await this.getEmployeeId(req)
    return this.overtimeService.createRequest(employeeId, {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      reason: dto.reason ?? '',
      projectReference: dto.projectReference,
    })
  }
}