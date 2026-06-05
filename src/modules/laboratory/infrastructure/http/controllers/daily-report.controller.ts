import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { DailyReportService } from '../../../application/services/daily-report.service';
import {
  CreateDailyReportHttpDto,
  RevisionRequestDto,
} from '../../http/dtos/daily-report.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  @Get('daily-reports')
  @RequirePermissions('daily-reports:read')
  async listDailyReports(
    @Query('status') status?: string,
    @Query('testingRequestId') testingRequestId?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dailyReportService.findAll({
      status,
      testingRequestId,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('daily-reports/:id')
  @RequirePermissions('daily-reports:read')
  async getDailyReport(@Param('id') id: string) {
    return this.dailyReportService.findById(id);
  }

  @Post('daily-reports')
  @RequirePermissions('daily-reports:create')
  async createDailyReport(@Body() dto: CreateDailyReportHttpDto) {
    return this.dailyReportService.create(dto);
  }

  @Patch('daily-reports/:id/submit')
  @RequirePermissions('daily-reports:submit')
  async submitDailyReport(@Param('id') id: string) {
    return this.dailyReportService.submit(id);
  }

  @Patch('daily-reports/:id/approve')
  @RequirePermissions('daily-reports:approve')
  async approveDailyReport(@Param('id') id: string, @Req() req: any) {
    return this.dailyReportService.approve(id, req.user?.id ?? 'unknown');
  }

  @Patch('daily-reports/:id/request-revision')
  @RequirePermissions('daily-reports:approve')
  async requestRevision(
    @Param('id') id: string,
    @Body() dto: RevisionRequestDto,
  ) {
    return this.dailyReportService.requestRevision(id, dto.rejectionReason);
  }

  @Delete('daily-reports/:id')
  @RequirePermissions('daily-reports:delete')
  async deleteDailyReport(@Param('id') id: string) {
    await this.dailyReportService.delete(id);
    return { success: true };
  }
}
