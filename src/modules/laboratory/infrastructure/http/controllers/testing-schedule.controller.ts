import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { TestingScheduleService } from '../../../application/services/testing-schedule.service';
import {
  CreateScheduleHttpDto,
  UpdateScheduleHttpDto,
  RescheduleHttpDto,
} from '../../http/dtos/schedule.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestingScheduleController {
  constructor(private readonly scheduleService: TestingScheduleService) {}

  @Get('schedules')
  @RequirePermissions('schedules:read')
  async listSchedules(
    @Query('status') status?: string,
    @Query('laboratoryId') laboratoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (startDate && endDate) {
      return this.scheduleService.findByDateRange(startDate, endDate);
    }
    return this.scheduleService.findAll({
      status,
      laboratoryId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('schedules/:id')
  @RequirePermissions('schedules:read')
  async getSchedule(@Param('id') id: string) {
    return this.scheduleService.findById(id);
  }

  @Post('schedules')
  @RequirePermissions('schedules:create')
  async createSchedule(@Body() dto: CreateScheduleHttpDto) {
    return this.scheduleService.create(dto);
  }

  @Put('schedules/:id')
  @RequirePermissions('schedules:update')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleHttpDto,
  ) {
    return this.scheduleService.update(id, dto);
  }

  @Patch('schedules/:id/reschedule')
  @RequirePermissions('schedules:update')
  async reschedule(@Param('id') id: string, @Body() dto: RescheduleHttpDto) {
    return this.scheduleService.reschedule(id, dto);
  }

  @Patch('schedules/:id/complete')
  @RequirePermissions('schedules:update')
  async completeSchedule(@Param('id') id: string) {
    return this.scheduleService.complete(id);
  }

  @Patch('schedules/:id/cancel')
  @RequirePermissions('schedules:update')
  async cancelSchedule(@Param('id') id: string) {
    return this.scheduleService.cancel(id);
  }

  @Delete('schedules/:id')
  @RequirePermissions('schedules:delete')
  async deleteSchedule(@Param('id') id: string) {
    await this.scheduleService.delete(id);
    return { success: true };
  }
}
