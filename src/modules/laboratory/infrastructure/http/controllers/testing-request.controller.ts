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
  AssignLaboranDto,
  UploadDocumentDto,
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
    const user = req.user ?? {};
    return this.testingRequestService.approve(
      id,
      user.id ?? 'unknown',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    );
  }

  @Patch('testing-requests/:id/reject')
  @RequirePermissions('testing-requests:approve')
  async rejectTestingRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    return this.testingRequestService.reject(
      id,
      user.id ?? 'unknown',
      dto.rejectionReason,
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    );
  }

  @Patch('testing-requests/:id/assign')
  @RequirePermissions('testing-requests:assign')
  async assignLaboran(
    @Param('id') id: string,
    @Body() dto: AssignLaboranDto,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    return this.testingRequestService.assignLaboran(
      id,
      dto.laboranId,
      dto.laboranName,
      user.id ?? 'unknown',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
      dto.notes,
    );
  }

  @Get('my/assignments')
  @RequirePermissions('testing-requests:read')
  async getMyAssignments(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const laboranId = req.user?.id;
    return this.testingRequestService.findByLaboranId(laboranId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('testing-requests/:id/timeline')
  @RequirePermissions('testing-requests:read')
  async getTimeline(@Param('id') id: string) {
    return this.testingRequestService.getTimeline(id);
  }

  @Patch('testing-requests/:id/upload-signed')
  @RequirePermissions('testing-requests:upload-document')
  async uploadSignedDocument(
    @Param('id') id: string,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.uploadSignedDocument(
      id,
      dto.fileUrl,
      dto.fileName,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Patch('testing-requests/:id/upload-payment-proof')
  @RequirePermissions('testing-requests:upload-document')
  async uploadPaymentProof(
    @Param('id') id: string,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.uploadPaymentProof(
      id,
      dto.fileUrl,
      dto.fileName,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Patch('testing-requests/:id/verify-documents')
  @RequirePermissions('testing-requests:verify-documents')
  async verifyDocumentsAndGrantQuota(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.verifyDocumentsAndGrantQuota(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Delete('testing-requests/:id')
  @RequirePermissions('testing-requests:delete')
  async deleteTestingRequest(@Param('id') id: string) {
    await this.testingRequestService.delete(id);
    return { success: true };
  }
}
