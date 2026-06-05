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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { TestingRequestService } from '../../../application/services/testing-request.service';
import {
  CreateTestingRequestHttpDto,
  UpdateTestingRequestHttpDto,
  ApproveRejectDto,
} from '../dtos/testing-request.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestingRequestController {
  constructor(private readonly testingRequestService: TestingRequestService) {}

  @Get('testing-requests')
  @RequirePermissions('testing-requests:read')
  async listTestingRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testingRequestService.findAll({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('testing-requests/:id')
  @RequirePermissions('testing-requests:read')
  async getTestingRequest(@Param('id') id: string) {
    return this.testingRequestService.findById(id);
  }

  @Post('testing-requests')
  @RequirePermissions('testing-requests:create')
  async createTestingRequest(@Body() dto: CreateTestingRequestHttpDto) {
    return this.testingRequestService.create(dto);
  }

  @Put('testing-requests/:id')
  @RequirePermissions('testing-requests:update')
  async updateTestingRequest(
    @Param('id') id: string,
    @Body() dto: UpdateTestingRequestHttpDto,
  ) {
    return this.testingRequestService.update(id, dto);
  }

  @Patch('testing-requests/:id/submit')
  @RequirePermissions('testing-requests:submit')
  async submitTestingRequest(@Param('id') id: string) {
    return this.testingRequestService.submit(id);
  }

  @Patch('testing-requests/:id/approve')
  @RequirePermissions('testing-requests:approve')
  async approveTestingRequest(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.testingRequestService.approve(id, userId);
  }

  @Patch('testing-requests/:id/reject')
  @RequirePermissions('testing-requests:approve')
  async rejectTestingRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    return this.testingRequestService.reject(
      id,
      req.user?.id ?? 'unknown',
      dto.rejectionReason,
    );
  }

  @Delete('testing-requests/:id')
  @RequirePermissions('testing-requests:delete')
  async deleteTestingRequest(@Param('id') id: string) {
    await this.testingRequestService.delete(id);
    return { success: true };
  }
}
