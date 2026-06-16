import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PostApprovalTestingScheduleService } from '../../../application/services/post-approval-testing-schedule.service';
import type { PostApprovalLabContractRepositoryPort } from '../../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../../domain/repositories/post-approval-lab-contract-repository.port';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostApprovalTestingScheduleController {
  constructor(
    private readonly service: PostApprovalTestingScheduleService,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
  ) {}

  @Get('post-approval/schedules')
  @RequirePermissions('schedules:read')
  async findAll(
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('laboranId') laboranId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.service.findAll({
      status,
      contractId,
      laboranId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    const enriched = await Promise.all(
      result.data.map(async (schedule) => {
        try {
          const contract = await this.contractRepo.findById(schedule.contractId);
          if (contract) {
            return {
              ...schedule,
              contractNumber: contract.contractNumber,
              customerName: contract.customerName,
              projectName: contract.projectName,
            };
          }
        } catch {}
        return schedule;
      }),
    );

    return {
      data: enriched,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      page: result.meta.page,
    };
  }

  @Get('post-approval/schedules/conflicts')
  @RequirePermissions('schedules:read')
  async checkLaboranConflicts(
    @Query('laboranId') laboranId: string,
    @Query('date') date: string,
    @Query('time') time?: string,
  ) {
    return this.service.findConflicts(laboranId, date, time);
  }

  @Get('post-approval/schedules/:id')
  @RequirePermissions('schedules:read')
  async findById(@Param('id') id: string) {
    const schedule = await this.service.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    try {
      const contract = await this.contractRepo.findById(schedule.contractId);
      if (contract) {
        return {
          ...schedule,
          contractNumber: contract.contractNumber,
          customerName: contract.customerName,
          projectName: contract.projectName,
        };
      }
    } catch {}
    return schedule;
  }

  @Get('post-approval/schedules/:id/samples')
  @RequirePermissions('schedules:read')
  async getScheduleSamples(@Param('id') id: string) {
    const schedule = await this.service.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    const result = await this.service.getScheduleWithSamples(id);
    let contractNumber = '';
    let projectName = '';
    let customerName = '';
    try {
      const contract = await this.contractRepo.findById(schedule.contractId);
      if (contract) {
        contractNumber = contract.contractNumber;
        projectName = contract.projectName ?? '';
        customerName = contract.customerName ?? '';
      }
    } catch {}
    return {
      schedule: { ...result.schedule, contractNumber, projectName, customerName },
      sampleAllocations: result.sampleAllocations,
    };
  }

  @Patch('post-approval/schedules/:id/confirm')
  @RequirePermissions('schedules:confirm')
  async confirmByAdmin(
    @Param('id') id: string,
    @Body('laboranId') laboranId: string,
    @Body('laboranName') laboranName: string,
    @Req() req: any,
    @Body('statusNotes') statusNotes?: string,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.confirmByAdmin(id, user.id ?? 'unknown', userName, {
      laboranId,
      laboranName,
      statusNotes,
    });
  }
}