import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { ContractTestInvoiceService } from '../../../application/services/contract-test-invoice.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
export class ContractTestInvoiceController {
  constructor(
    private readonly contractTestInvoiceService: ContractTestInvoiceService,
  ) {}

  // ─── Admin: list, detail, generate ───────────────────────────────────

  @Get('contract-test-invoices')
  @RequirePermissions('contracts:read')
  async listContractTestInvoices(
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractTestInvoiceService.findAll({
      status,
      contractId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('contract-test-invoices/:id')
  @RequirePermissions('contracts:read')
  async getContractTestInvoice(@Param('id') id: string) {
    return this.contractTestInvoiceService.findById(id);
  }

  @Get('contract-test-invoices/:id/download')
  @RequirePermissions('contracts:read')
  async downloadContractTestInvoice(@Param('id') id: string) {
    return this.contractTestInvoiceService.getDownloadUrl(id);
  }

  @Post('contract-test-invoices/generate')
  @RequirePermissions('contracts:approve')
  async generateInvoice(
    @Body() body: { contractId: string; testingScheduleId?: string },
    @Req() req: any,
  ) {
    if (!body?.contractId) {
      throw new BadRequestException('contractId is required');
    }
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.contractTestInvoiceService.generateForSchedule(
      body.contractId,
      body.testingScheduleId ?? null,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Patch('contract-test-invoices/:id/verify-payment')
  @RequirePermissions('contracts:approve')
  async verifyInvoicePayment(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.contractTestInvoiceService.verifyPayment(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }

  // ─── Admin: view uploaded proof ───────────────────────────────────────

  @Get('contract-test-invoices/:id/payment-proof')
  @RequirePermissions('contracts:read')
  async getPaymentProofDownloadUrl(@Param('id') id: string) {
    return this.contractTestInvoiceService.getPaymentProofDownloadUrl(id);
  }

  @Delete('contract-test-invoices/:id')
  @RequirePermissions('contracts:approve')
  async deleteContractTestInvoice(@Param('id') id: string) {
    return this.contractTestInvoiceService.delete(id);
  }
}
