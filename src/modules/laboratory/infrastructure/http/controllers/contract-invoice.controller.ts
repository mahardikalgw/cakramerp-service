import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { AR_INVOICE_SERVICE } from '../../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../../finance/application/ports/ar-invoice-service.port';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractInvoiceController {
  constructor(
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
  ) {}

  @Get('contract-invoices')
  @RequirePermissions('contracts:read')
  async listContractInvoices(
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

  @Get('contract-invoices/:id')
  @RequirePermissions('contracts:read')
  async getContractInvoice(@Param('id') id: string) {
    return this.arInvoiceService.findById(id);
  }

  @Get('contract-invoices/:id/download')
  @RequirePermissions('contracts:read')
  async downloadContractInvoice(@Param('id') id: string) {
    return this.arInvoiceService.getDownloadUrl(id);
  }

  @Patch('contract-invoices/:id/mark-paid')
  @RequirePermissions('contracts:approve')
  async markInvoicePaid(@Param('id') id: string, @Req() req: any) {
    const user = req.user ?? {};
    return this.arInvoiceService.markAsPaid(
      id,
      user.id ?? 'unknown',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    );
  }

  @Delete('contract-invoices/:id')
  @RequirePermissions('contracts:approve')
  async deleteContractInvoice(@Param('id') id: string) {
    return this.arInvoiceService.delete(id);
  }
}
