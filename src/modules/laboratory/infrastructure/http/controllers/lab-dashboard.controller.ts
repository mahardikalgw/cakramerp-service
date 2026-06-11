import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { LabDashboardService } from '../../../application/services/lab-dashboard.service';
import { QuotaMonitoringService } from '../../../application/services/quota-monitoring.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabDashboardController {
  constructor(
    private readonly dashboardService: LabDashboardService,
    private readonly quotaService: QuotaMonitoringService,
  ) {}

  @Get('dashboard/admin')
  @RequirePermissions('testing-requests:read')
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('dashboard/lab')
  @RequirePermissions('schedules:read')
  async getLabDashboard() {
    return this.dashboardService.getLabDashboard();
  }

  @Get('dashboard/customer')
  @RequirePermissions('testing-requests:read')
  async getCustomerDashboard(@Query('customerId') customerId: string) {
    return this.dashboardService.getCustomerDashboard(customerId);
  }

  @Get('quota/dashboard')
  @RequirePermissions('contracts:read')
  async getQuotaDashboard(@Query('customerId') customerId?: string) {
    return this.quotaService.getQuotaDashboard(customerId);
  }

  @Get('quota/check')
  @RequirePermissions('contracts:read')
  async checkQuotaAvailability(
    @Query('contractId') contractId: string,
    @Query('amount') amount: string,
  ) {
    return this.quotaService.checkQuotaAvailability(
      contractId,
      parseInt(amount, 10),
    );
  }
}
