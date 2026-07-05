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
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
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
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testingRequestService.findAll({
      status,
      search,
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
  async approveTestingRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    return this.testingRequestService.approve(
      id,
      user.id ?? 'unknown',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
      dto.downPaymentAmount,
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadSignedDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.uploadSignedDocumentFile(
      id,
      file,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Patch('testing-requests/:id/upload-payment-proof')
  @RequirePermissions('testing-requests:upload-document')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadPaymentProof(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.uploadPaymentProofFile(
      id,
      file,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Get('testing-requests/:id/download-signed')
  @RequirePermissions('testing-requests:read')
  async downloadSigned(@Param('id') id: string) {
    return this.testingRequestService.getSignedDownloadUrl(id);
  }

  @Get('testing-requests/:id/download-payment-proof')
  @RequirePermissions('testing-requests:read')
  async downloadPaymentProof(@Param('id') id: string) {
    return this.testingRequestService.getPaymentProofDownloadUrl(id);
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

  @Get('testing-requests/:id/download-contract')
  @RequirePermissions('testing-requests:read')
  async downloadContractDocument(@Param('id') id: string) {
    return this.testingRequestService.getContractDocumentDownloadUrl(id);
  }

  @Get('testing-requests/:id/download-tax-invoice')
  @RequirePermissions('testing-requests:read')
  async downloadTaxInvoice(@Param('id') id: string) {
    return this.testingRequestService.getTaxInvoiceDownloadUrl(id);
  }

  @Get('testing-requests/:id/download-po')
  @RequirePermissions('testing-requests:read')
  async downloadPO(@Param('id') id: string) {
    return this.testingRequestService.getPoDownloadUrl(id);
  }

  @Get('testing-requests/:id/download-invoice')
  @RequirePermissions('testing-requests:read')
  async downloadInvoice(@Param('id') id: string) {
    return this.testingRequestService.getInvoiceDownloadUrl(id);
  }

  @Delete('testing-requests/:id/payment-proof')
  @RequirePermissions('testing-requests:upload-document')
  async deletePaymentProof(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.deletePaymentProof(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Delete('testing-requests/:id/signed-document')
  @RequirePermissions('testing-requests:upload-document')
  async deleteSignedDocument(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.deleteSignedDocument(
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

  @Patch('testing-requests/:id/confirm-dp-payment')
  @RequirePermissions('testing-requests:approve')
  async confirmDpPayment(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.confirmDpPayment(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Patch('testing-requests/:id/confirm-signed-contract')
  @RequirePermissions('testing-requests:approve')
  async confirmSignedContract(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.testingRequestService.confirmSignedContract(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }
}
