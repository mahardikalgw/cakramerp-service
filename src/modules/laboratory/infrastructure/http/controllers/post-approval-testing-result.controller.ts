import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PostApprovalTestingResultService } from '../../../application/services/post-approval-testing-result.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostApprovalTestingResultController {
  constructor(
    private readonly service: PostApprovalTestingResultService,
  ) {}

  @Get('post-approval/testing-results/by-unit')
  @RequirePermissions('test-results:read')
  async findByUnit(
    @Query('scheduleSampleId') scheduleSampleId: string,
    @Query('sampleUnit') sampleUnit: string,
  ) {
    const result = await this.service.findByUnit(
      scheduleSampleId,
      parseInt(sampleUnit, 10),
    );
    return result ?? null;
  }

  @Get('post-approval/testing-results')
  @RequirePermissions('test-results:read')
  async findAll(
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      contractId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('post-approval/testing-results/:id')
  @RequirePermissions('test-results:read')
  async findById(@Param('id') id: string) {
    return this.service.findByIdEnriched(id);
  }

  @Post('post-approval/testing-results')
  @RequirePermissions('test-results:create')
  async createOrUpdate(
    @Body('scheduleId') scheduleId: string,
    @Body('scheduleSampleId') scheduleSampleId: string,
    @Body('sampleUnit') sampleUnit: number,
    @Body('contractId') contractId: string,
    @Req() req: any,
    @Body('resultData') resultData?: Record<string, unknown>,
    @Body('resultNotes') resultNotes?: string,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.createOrUpdate({
      scheduleId,
      scheduleSampleId,
      sampleUnit,
      contractId,
      userId: user.id ?? 'unknown',
      userName,
      resultData: resultData ?? {},
      resultNotes,
    });
  }

  @Patch('post-approval/testing-results/:id')
  @RequirePermissions('test-results:update')
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body('resultData') resultData?: Record<string, unknown>,
    @Body('resultNotes') resultNotes?: string,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.createOrUpdate({
      scheduleId: id,
      scheduleSampleId: '',
      sampleUnit: 0,
      contractId: '',
      userId: user.id ?? 'unknown',
      userName,
      resultData: resultData ?? {},
      resultNotes,
    });
  }

  @Patch('post-approval/testing-results/:id/submit')
  @RequirePermissions('test-results:submit')
  async submit(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.submit(id, user.id ?? 'unknown', userName);
  }

  @Post('post-approval/testing-results/:id/generate-certificate')
  @RequirePermissions('test-results:create')
  async generateCertificate(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.generateCertificate(id, user.id ?? 'unknown', userName);
  }

  @Patch('post-approval/testing-results/:id/upload-signed-certificate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @RequirePermissions('test-results:update')
  async uploadSignedCertificate(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new NotFoundException('File is required');
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.uploadSignedCertificate(id, file, user.id ?? 'unknown', userName);
  }

  @Get('post-approval/testing-results/:id/download-signed-certificate')
  @RequirePermissions('test-results:read')
  async downloadSignedCertificate(@Param('id') id: string) {
    const result = await this.service.getSignedCertificate(id);
    if (!result) throw new NotFoundException('Signed certificate not found');
    return result;
  }
}