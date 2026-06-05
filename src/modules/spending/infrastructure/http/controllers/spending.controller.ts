import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { SPENDING_SERVICE } from '../../../application/ports/spending-service.port';
import type { SpendingServicePort } from '../../../application/ports/spending-service.port';
import { SpendingService } from '../../../application/services/spending.service';

@Controller('spending')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpendingController {
  constructor(
    @Inject(SPENDING_SERVICE)
    private readonly spendingServicePort: SpendingServicePort,
    private readonly spendingService: SpendingService,
  ) {}

  @Get()
  @RequirePermissions('spending:read')
  async listSpendings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.spendingService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get(':id')
  @RequirePermissions('spending:read')
  async getSpending(@Param('id') id: string) {
    return this.spendingService.findById(id);
  }

  @Post()
  @RequirePermissions('spending:create')
  async createSpending(
    @Body()
    dto: {
      expenseCategory: string;
      amount: number;
      spendingDate: string;
      description?: string;
      vendor?: string;
      referenceNo?: string;
      paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
    },
  ) {
    return this.spendingService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('spending:update')
  async updateSpending(
    @Param('id') id: string,
    @Body()
    dto: {
      expenseCategory?: string;
      amount?: number;
      spendingDate?: string;
      description?: string;
      vendor?: string;
      referenceNo?: string;
      paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
    },
  ) {
    return this.spendingService.update(id, dto);
  }

  @Patch(':id/approve')
  @RequirePermissions('spending:approve')
  async approveSpending(@Param('id') id: string) {
    return this.spendingService.approve(id);
  }

  @Patch(':id/reject')
  @RequirePermissions('spending:approve')
  async rejectSpending(@Param('id') id: string) {
    return this.spendingService.reject(id);
  }

  @Delete(':id')
  @RequirePermissions('spending:delete')
  async deleteSpending(@Param('id') id: string) {
    return this.spendingService.delete(id);
  }

  @Post(':id/gl-posting')
  @RequirePermissions('spending:approve')
  async createGlPosting(@Param('id') id: string) {
    return this.spendingService.createGlPostingEntry(id);
  }
}
