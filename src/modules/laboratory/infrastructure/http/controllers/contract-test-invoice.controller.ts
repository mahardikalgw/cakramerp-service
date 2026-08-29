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
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { AR_INVOICE_SERVICE } from '../../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../../finance/application/ports/ar-invoice-service.port';
import { LabBillingAdapter } from '../../../application/adapters/lab-billing.adapter';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
export class ContractTestInvoiceController {
  constructor(
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
    private readonly labBillingAdapter: LabBillingAdapter,
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
    return this.arInvoiceService.findAll({
      status,
      contractId,
      sourceType: 'lab_contract',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('contract-test-invoices/:id')
  @RequirePermissions('contracts:read')
  async getContractTestInvoice(@Param('id') id: string) {
    return this.arInvoiceService.findById(id);
  }

  @Get('contract-test-invoices/:id/download')
  @RequirePermissions('contracts:read')
  async downloadContractTestInvoice(@Param('id') id: string) {
    return this.arInvoiceService.getDownloadUrl(id);
  }

  @Post('contract-test-invoices/generate')
  @RequirePermissions('contracts:approve')
  async generateInvoice(
    @Body() body: { contractId: string; testingScheduleId?: string },
  ) {
    if (!body?.contractId) {
      throw new BadRequestException('contractId is required');
    }
    return this.labBillingAdapter.createContractScheduleInvoice(
      body.contractId,
      body.testingScheduleId ?? null,
    );
  }

  @Patch('contract-test-invoices/:id/verify-payment')
  @RequirePermissions('contracts:approve')
  async verifyInvoicePayment(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined;
    return this.arInvoiceService.verifyLabPayment(
      id,
      user.id ?? 'unknown',
      userName,
    );
  }

  // ─── Admin: view uploaded proof ───────────────────────────────────────

  @Get('contract-test-invoices/:id/payment-proof')
  @RequirePermissions('contracts:read')
  async getPaymentProofDownloadUrl(@Param('id') id: string) {
    return this.arInvoiceService.getPaymentProofDownloadUrl(id);
  }

  @Delete('contract-test-invoices/:id')
  @RequirePermissions('contracts:approve')
  async deleteContractTestInvoice(@Param('id') id: string) {
    return this.arInvoiceService.delete(id);
  }
}
