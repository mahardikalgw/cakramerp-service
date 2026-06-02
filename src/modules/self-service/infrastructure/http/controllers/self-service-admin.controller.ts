import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { MY_OVERTIME_SERVICE } from '../../../application/ports/my-overtime-service.port';
import type { MyOvertimeServicePort } from '../../../application/ports/my-overtime-service.port';
import { MY_LEAVE_SERVICE } from '../../../application/ports/my-leave-service.port';
import type { MyLeaveServicePort } from '../../../application/ports/my-leave-service.port';
import { MY_PROFILE_SERVICE } from '../../../application/ports/my-profile-service.port';
import type { MyProfileServicePort } from '../../../application/ports/my-profile-service.port';
import { MyProfileService } from '../../../application/services/my-profile.service';
import {
  DISCREPANCY_REPORT_REPOSITORY,
  PROFILE_CHANGE_REQUEST_REPOSITORY,
  LEAVE_REQUEST_REPOSITORY,
} from '../../../domain/repositories/self-service-repository.port';
import type {
  DiscrepancyReportRepositoryPort,
  ProfileChangeRequestRepositoryPort,
  LeaveRequestRepositoryPort,
} from '../../../domain/repositories/self-service-repository.port';
import {
  RejectLeaveHttpDto,
  ResolveDiscrepancyHttpDto,
  RejectChangeRequestHttpDto,
} from '../dtos/self-service.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SelfServiceAdminController {
  constructor(
    @Inject(MY_OVERTIME_SERVICE)
    private readonly overtimeService: MyOvertimeServicePort,
    @Inject(MY_LEAVE_SERVICE)
    private readonly leaveService: MyLeaveServicePort,
    @Inject(MY_PROFILE_SERVICE)
    private readonly profileService: MyProfileServicePort & {
      getEmployeeIdFromUserId: (userId: string) => Promise<string>;
    },
    @Inject(DISCREPANCY_REPORT_REPOSITORY)
    private readonly discrepancyReportRepo: DiscrepancyReportRepositoryPort,
    @Inject(PROFILE_CHANGE_REQUEST_REPOSITORY)
    private readonly profileChangeRequestRepo: ProfileChangeRequestRepositoryPort,
    @Inject(LEAVE_REQUEST_REPOSITORY)
    private readonly leaveRequestRepo: LeaveRequestRepositoryPort,
  ) {}

  private async getEmployeeIdFromUser(req: any): Promise<string> {
    const userId = req.user.sub ?? req.user.id;
    return (this.profileService as MyProfileService).getEmployeeIdFromUserId(
      userId,
    );
  }

  @Get('overtime-requests/pending')
  @RequirePermissions('overtime:approve')
  async getPendingOvertimeForSupervisor(@Req() req: any) {
    const supervisorId = req.user.sub ?? req.user.id;
    return this.overtimeService.getPendingForSupervisor(supervisorId);
  }

  @Patch('overtime-requests/:id/approve')
  @RequirePermissions('overtime:approve')
  async approveOvertime(@Req() req: any, @Param('id') requestId: string) {
    const approverId = req.user.sub ?? req.user.id;
    return this.overtimeService.approve(requestId, approverId);
  }

  @Patch('overtime-requests/:id/reject')
  @RequirePermissions('overtime:approve')
  async rejectOvertime(
    @Req() req: any,
    @Param('id') requestId: string,
    @Body('reason') reason: string,
  ) {
    const approverId = req.user.sub ?? req.user.id;
    return this.overtimeService.reject(requestId, approverId, reason);
  }

  @Get('leave-requests/pending')
  @RequirePermissions('leave:approve')
  async getPendingLeaveRequests() {
    return this.leaveRequestRepo.findPending();
  }

  @Patch('leave-requests/:id/approve')
  @RequirePermissions('leave:approve')
  async approveLeave(@Req() req: any, @Param('id') leaveRequestId: string) {
    const approverId = req.user.sub ?? req.user.id;
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }
    return this.leaveService.approveLeave(
      leaveRequest.employeeId,
      leaveRequestId,
      approverId,
    );
  }

  @Patch('leave-requests/:id/reject')
  @RequirePermissions('leave:approve')
  async rejectLeave(
    @Req() req: any,
    @Param('id') leaveRequestId: string,
    @Body() dto: RejectLeaveHttpDto,
  ) {
    const approverId = req.user.sub ?? req.user.id;
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }
    return this.leaveService.rejectLeave(
      leaveRequest.employeeId,
      leaveRequestId,
      approverId,
      dto.reason,
    );
  }

  @Get('discrepancy-reports/pending')
  @RequirePermissions('attendance:approve')
  async getPendingDiscrepancyReports() {
    return this.discrepancyReportRepo.findPending();
  }

  @Patch('discrepancy-reports/:id/resolve')
  @RequirePermissions('attendance:approve')
  async resolveDiscrepancy(
    @Req() req: any,
    @Param('id') reportId: string,
    @Body() dto: ResolveDiscrepancyHttpDto,
  ) {
    const resolvedBy = req.user.sub ?? req.user.id;
    return this.discrepancyReportRepo.update(reportId, {
      status: 'resolved',
      resolvedBy,
      resolvedAt: new Date(),
      resolution: dto.resolution,
    });
  }

  @Get('profile-change-requests/pending')
  @RequirePermissions('users:update')
  async getPendingProfileChangeRequests() {
    return this.profileChangeRequestRepo.findPending();
  }

  @Patch('profile-change-requests/:id/approve')
  @RequirePermissions('users:update')
  async approveProfileChangeRequest(
    @Req() req: any,
    @Param('id') requestId: string,
  ) {
    const reviewedBy = req.user.sub ?? req.user.id;
    const changeRequest =
      await this.profileChangeRequestRepo.findById(requestId);
    if (!changeRequest) {
      throw new Error('Change request not found');
    }

    return this.profileChangeRequestRepo.update(requestId, {
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date(),
    });
  }

  @Patch('profile-change-requests/:id/reject')
  @RequirePermissions('users:update')
  async rejectProfileChangeRequest(
    @Req() req: any,
    @Param('id') requestId: string,
    @Body() dto: RejectChangeRequestHttpDto,
  ) {
    const reviewedBy = req.user.sub ?? req.user.id;
    return this.profileChangeRequestRepo.update(requestId, {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
    });
  }
}
