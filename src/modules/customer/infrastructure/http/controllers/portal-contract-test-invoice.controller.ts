import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { AR_INVOICE_SERVICE } from '../../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../../finance/application/ports/ar-invoice-service.port';

@Controller('portal/lab/contract-test-invoices')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class PortalContractTestInvoiceController {
  constructor(
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
  ) {}

  @Get()
  async listForCustomer(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const customerId = req.user?.customerId ?? req.user?.id;
    if (!customerId) {
      throw new BadRequestException('Customer context not available');
    }
    return this.arInvoiceService.findByCustomerId(customerId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async detailForCustomer(@Param('id') id: string) {
    return this.arInvoiceService.findById(id);
  }

  @Get(':id/download')
  async downloadForCustomer(@Param('id') id: string) {
    return this.arInvoiceService.getDownloadUrl(id);
  }

  @Patch(':id/upload-payment-proof')
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
    return this.arInvoiceService.uploadPaymentProof(
      id,
      file,
      user.id ?? 'unknown',
      userName,
    );
  }
}
