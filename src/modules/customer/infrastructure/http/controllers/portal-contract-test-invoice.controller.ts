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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { ContractTestInvoiceService } from '../../../../laboratory/application/services/contract-test-invoice.service';

@Controller('portal/lab/contract-test-invoices')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class PortalContractTestInvoiceController {
  constructor(
    private readonly contractTestInvoiceService: ContractTestInvoiceService,
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
    return this.contractTestInvoiceService.findByCustomerId(customerId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async detailForCustomer(@Param('id') id: string) {
    return this.contractTestInvoiceService.findById(id);
  }

  @Get(':id/download')
  async downloadForCustomer(@Param('id') id: string) {
    return this.contractTestInvoiceService.getDownloadUrl(id);
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
    return this.contractTestInvoiceService.uploadPaymentProof(
      id,
      file,
      user.id ?? 'unknown',
      userName,
    );
  }
}
