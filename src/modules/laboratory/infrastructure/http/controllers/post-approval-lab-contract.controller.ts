import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PostApprovalLabContractService } from '../../../application/services/post-approval-lab-contract.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostApprovalLabContractController {
  constructor(private readonly service: PostApprovalLabContractService) {}

  @Get('post-approval/contracts')
  @RequirePermissions('contracts:read')
  async findAll(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('post-approval/contracts/:id')
  @RequirePermissions('contracts:read')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('post-approval/contracts')
  @RequirePermissions('contracts:create')
  async generateFromTestingRequest(
    @Body('testingRequestId') testingRequestId: string,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.service.generateFromTestingRequest(
      testingRequestId,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Get('post-approval/contracts/:id/download-contract')
  @RequirePermissions('contracts:read')
  async downloadContract(@Param('id') id: string) {
    return this.service.getContractDownloadUrl(id);
  }

  @Get('post-approval/contracts/:id/download-tax-invoice')
  @RequirePermissions('contracts:read')
  async downloadTaxInvoice(@Param('id') id: string) {
    return this.service.getTaxInvoiceDownloadUrl(id);
  }

  @Post('post-approval/contracts/:id/regenerate-documents')
  @RequirePermissions('contracts:update')
  async regenerateDocuments(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.service.regenerateDocuments(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }
}