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
import { TestResultService } from '../../../application/services/test-result.service';
import {
  CreateTestResultHttpDto,
  UpdateTestResultHttpDto,
} from '../../http/dtos/test-result.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestResultController {
  constructor(private readonly testResultService: TestResultService) {}

  @Get('test-results')
  @RequirePermissions('test-results:read')
  async listTestResults(
    @Query('status') status?: string,
    @Query('sampleId') sampleId?: string,
    @Query('testingRequestId') testingRequestId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testResultService.findAll({
      status,
      sampleId,
      testingRequestId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('test-results/:id')
  @RequirePermissions('test-results:read')
  async getTestResult(@Param('id') id: string) {
    return this.testResultService.findById(id);
  }

  @Post('test-results')
  @RequirePermissions('test-results:create')
  async createTestResult(
    @Body() dto: CreateTestResultHttpDto,
    @Req() req: any,
  ) {
    return this.testResultService.create({
      ...dto,
      testedById: req.user?.id,
      testedByName: req.user
        ? `${req.user.firstName} ${req.user.lastName}`
        : undefined,
    });
  }

  @Put('test-results/:id')
  @RequirePermissions('test-results:update')
  async updateTestResult(
    @Param('id') id: string,
    @Body() dto: UpdateTestResultHttpDto,
  ) {
    return this.testResultService.update(id, dto);
  }

  @Patch('test-results/:id/submit')
  @RequirePermissions('test-results:submit')
  async submitTestResult(@Param('id') id: string) {
    return this.testResultService.submit(id);
  }

  @Patch('test-results/:id/approve')
  @RequirePermissions('test-results:approve')
  async approveTestResult(@Param('id') id: string, @Req() req: any) {
    return this.testResultService.approve(id, req.user?.id ?? 'unknown');
  }

  @Patch('test-results/:id/request-revision')
  @RequirePermissions('test-results:approve')
  async requestRevision(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.testResultService.requestRevision(id, reason);
  }

  @Delete('test-results/:id')
  @RequirePermissions('test-results:delete')
  async deleteTestResult(@Param('id') id: string) {
    await this.testResultService.delete(id);
    return { success: true };
  }
}
