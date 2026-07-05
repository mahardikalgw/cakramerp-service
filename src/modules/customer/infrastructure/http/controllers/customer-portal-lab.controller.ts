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
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { SampleRepositoryPort } from '../../../../laboratory/domain/repositories/sample-repository.port';
import { SAMPLE_REPOSITORY } from '../../../../laboratory/domain/repositories/sample-repository.port';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PostApprovalLabContractService } from '../../../../laboratory/application/services/post-approval-lab-contract.service';
import { PostApprovalTestingScheduleService } from '../../../../laboratory/application/services/post-approval-testing-schedule.service';
import { PostApprovalTestingResultService } from '../../../../laboratory/application/services/post-approval-testing-result.service';
import { PostApprovalDocumentArchiveService } from '../../../../laboratory/application/services/post-approval-document-archive.service';
import { TestingRequestService } from '../../../../laboratory/application/services/testing-request.service';
import { ContractInvoiceService } from '../../../../laboratory/application/services/contract-invoice.service';
import { DocumentGenerationHelper } from '../../../../shared/infrastructure/document-generation/document-generation.helper';
import { CustomerPortalService } from '../../../application/services/customer-portal.service';
import type { CustomerRepositoryPort } from '../../../domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../../domain/repositories/customer-repository.port';
import type { UserRepositoryPort } from '../../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../../user/domain/repositories/user-repository.port';

@Controller('portal/lab')
export class CustomerPortalLabController {
  constructor(
    private readonly contractService: PostApprovalLabContractService,
    private readonly scheduleService: PostApprovalTestingScheduleService,
    private readonly testingResultService: PostApprovalTestingResultService,
    private readonly archiveService: PostApprovalDocumentArchiveService,
    private readonly testingRequestService: TestingRequestService,
    private readonly contractInvoiceService: ContractInvoiceService,
    private readonly portalService: CustomerPortalService,
    private readonly docHelper: DocumentGenerationHelper,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(SAMPLE_REPOSITORY)
    private readonly sampleRepo: SampleRepositoryPort,
  ) {}

  private async resolveCustomerId(userId: string): Promise<string> {
    let customer = await this.customerRepo.findByUserId?.(userId);
    if (customer) return customer.id as string;

    const user = await this.userRepo.findById(userId);
    if (user?.email) {
      customer = await this.customerRepo.findByEmail?.(user.email);
      if (customer) {
        customer.userId = userId;
        customer.portalAccess = true;
        await this.customerRepo.save(customer);
        return customer.id as string;
      }
    }

    throw new NotFoundException('Customer profile not found');
  }

  private async assertContractOwnership(
    contractId: string,
    customerId: string,
  ): Promise<any> {
    const contract = await this.contractService.findById(contractId);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (contract.customerId !== customerId) {
      throw new ForbiddenException('Access denied');
    }
    return contract;
  }

  @Get('contracts')
  @UseGuards(JwtAuthGuard)
  async getMyContracts(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const result = await this.contractService.findAll({
      customerId,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      data: result.data,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      page: result.meta.page,
    };
  }

  @Get('contracts/:id')
  @UseGuards(JwtAuthGuard)
  async getContractDetail(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const contract = await this.assertContractOwnership(id, customerId);
    const pendingQuota = await this.scheduleService.getPendingQuota(id);
    const pendingBySample =
      await this.scheduleService.getPendingAllocationsBySample(id);
    const sampleLines = ((contract as any).sampleLines ?? []).map((s: any) => {
      const pending = pendingBySample[s.id] || 0;
      const completed = s.completedQuantity ?? 0;
      const availableForSchedule = Math.max(
        0,
        (s.sampleQuantity ?? 1) - completed - pending,
      );
      return {
        ...s,
        pendingQuantity: pending,
        availableForSchedule,
      };
    });
    return { ...contract, pendingQuota, sampleLines };
  }

  @Get('contracts/:id/download-contract')
  @UseGuards(JwtAuthGuard)
  async downloadContract(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(id, customerId);
    return this.contractService.getContractDownloadUrl(id);
  }

  @Get('contracts/:id/download-tax-invoice')
  @UseGuards(JwtAuthGuard)
  async downloadTaxInvoice(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(id, customerId);
    return this.contractService.getTaxInvoiceDownloadUrl(id);
  }

  @Get('contracts/:id/schedules')
  @UseGuards(JwtAuthGuard)
  async getContractSchedules(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(id, customerId);
    return this.scheduleService.findByContractId(id);
  }

  @Post('contracts/:id/schedules')
  @UseGuards(JwtAuthGuard)
  async createSchedule(
    @Req() req: any,
    @Param('id') contractId: string,
    @Body()
    body: {
      scheduledDate: string;
      scheduledTime?: string;
      scheduledLocation?: string;
      notes?: string;
      sampleAllocations: Array<{
        contractSampleId: string;
        allocatedQuantity: number;
      }>;
    },
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(contractId, customerId);
    return this.scheduleService.createByCustomer({
      contractId,
      userId: req.user.id,
      userName: req.user.name,
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      scheduledLocation: body.scheduledLocation,
      notes: body.notes,
      sampleAllocations: body.sampleAllocations,
    });
  }

  @Get('schedules/:id')
  @UseGuards(JwtAuthGuard)
  async getScheduleDetail(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const schedule = await this.scheduleService.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    const contract = await this.assertContractOwnership(
      schedule.contractId,
      customerId,
    );
    return {
      ...schedule,
      contractNumber: contract.contractNumber,
      projectName: contract.projectName,
    };
  }

  @Get('schedules/:id/samples')
  @UseGuards(JwtAuthGuard)
  async getScheduleSamples(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const schedule = await this.scheduleService.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    const contract = await this.assertContractOwnership(
      schedule.contractId,
      customerId,
    );
    const result = await this.scheduleService.getScheduleWithSamples(id);
    return {
      schedule: {
        ...result.schedule,
        contractNumber: contract.contractNumber,
        projectName: contract.projectName,
      },
      sampleAllocations: result.sampleAllocations,
    };
  }

  @Patch('schedules/:id')
  @UseGuards(JwtAuthGuard)
  async cancelSchedule(@Req() req: any, @Param('id') id: string) {
    return this.scheduleService.cancelByCustomer(id, req.user.id);
  }

  @Get('testing-results')
  @UseGuards(JwtAuthGuard)
  async getMyTestingResults(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testingResultService.findAll({
      status,
      contractId,
      scheduleId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('testing-results/:id')
  @UseGuards(JwtAuthGuard)
  async getTestingResultDetail(@Param('id') id: string) {
    return this.testingResultService.findByIdEnriched(id);
  }

  @Patch('testing-results/:id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmResult(@Req() req: any, @Param('id') id: string) {
    return this.testingResultService.confirmByCustomer(
      id,
      req.user.id,
      req.user.name,
    );
  }

  @Get('testing-results/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadResultCertificate(
    @Param('id') id: string,
  ): Promise<{ url: string }> {
    const result = await this.testingResultService.findById(id);
    if (!result?.certificateDocumentId) {
      throw new NotFoundException('Certificate not generated yet');
    }
    const url = await this.docHelper.getDownloadUrl(
      result.certificateDocumentId,
    );
    return { url };
  }

  @Get('archives')
  @UseGuards(JwtAuthGuard)
  async getMyArchives(
    @Req() req: any,
    @Query('documentType') documentType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.archiveService.findAll({
      documentType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('archives/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadArchive(@Param('id') id: string) {
    return this.archiveService.getDownloadUrl(id);
  }

  @Patch('testing-requests/:id/upload-signed-contract-file')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadSignedContractFile(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.portalService.uploadSignedContract(req.user.id, id, file);
  }

  @Get('testing-requests/:id/download-contract')
  @UseGuards(JwtAuthGuard)
  async downloadContractDocument(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const request = await this.testingRequestService.findById(id);
    if (!request) throw new NotFoundException('Testing request not found');
    if ((request as any).customerId !== customerId)
      throw new ForbiddenException('Access denied');
    // First try: contract document URL stored directly on the testing request (new flow)
    const contractDocUrl = (request as any).contractDocumentUrl;
    if (contractDocUrl) {
      const url = await this.docHelper.getDownloadUrl(contractDocUrl);
      if (url) return { url, filename: `contract_${id.substring(0, 8)}.pdf` };
    }
    // Fallback: contract entity's document URL (old flow)
    if ((request as any).labContractId) {
      return this.contractService.getContractDownloadUrl(
        (request as any).labContractId,
      );
    }
    throw new NotFoundException('Contract document not found');
  }

  @Get('testing-requests/:id/download-dp-invoice')
  @UseGuards(JwtAuthGuard)
  async downloadDpInvoice(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const request = await this.testingRequestService.findById(id);
    if (!request) throw new NotFoundException('Testing request not found');
    if ((request as any).customerId !== customerId)
      throw new ForbiddenException('Access denied');
    const invoiceDocId = (request as any).invoiceDocumentUrl;
    if (!invoiceDocId)
      throw new NotFoundException('DP invoice not yet generated');
    const url = await this.docHelper.getDownloadUrl(invoiceDocId);
    if (!url) throw new NotFoundException('Invoice document URL not available');
    return { url, filename: `dp_invoice_${id.substring(0, 8)}.pdf` };
  }

  @Post('contracts/:id/samples')
  @UseGuards(JwtAuthGuard)
  async addContractSamples(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      samples: Array<{
        testingServiceId?: string;
        serviceName: string;
        sampleCode?: string;
        sampleQuantity: number;
      }>;
    },
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(id, customerId);
    return this.contractService.addContractSamples(id, body.samples || []);
  }

  @Get('contracts/active')
  @UseGuards(JwtAuthGuard)
  async getActiveContracts(@Req() req: any) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const result = await this.contractService.findAll({
      customerId: customerId as any,
      status: 'active',
    });
    return result.data;
  }

  @Get('contract-invoices')
  @UseGuards(JwtAuthGuard)
  async getMyContractInvoices(@Req() req: any) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const contracts = await this.contractService.findAll({
      customerId: customerId as any,
    });
    const allInvoices: any[] = [];
    for (const contract of contracts.data) {
      const invoices = await this.contractInvoiceService.findByContractId(
        contract.id,
      );
      allInvoices.push(
        ...invoices.map((i) => ({
          ...i,
          contractNumber: (contract as any).contractNumber,
        })),
      );
    }
    return allInvoices;
  }

  @Get('contract-invoices/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadMyContractInvoice(@Req() req: any, @Param('id') id: string) {
    return this.contractInvoiceService.getDownloadUrl(id);
  }

  @Get('closed-contracts')
  @UseGuards(JwtAuthGuard)
  async getMyClosedContracts(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const result = await this.contractService.getClosedContracts({
      search,
      page: +page,
      limit: +limit,
    });
    // Filter to only this customer's contracts
    return {
      ...result,
      data: result.data.filter((c: any) => c.customerId === customerId),
    };
  }

  @Get('testing-requests/:id/samples')
  @UseGuards(JwtAuthGuard)
  async getTestingRequestSamples(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const request = await this.testingRequestService.findById(id);
    if (!request) throw new NotFoundException('Testing request not found');
    if ((request as any).customerId !== customerId)
      throw new ForbiddenException('Access denied');
    const samples = await this.sampleRepo.findByTestingRequestId(id);
    return samples;
  }

  @Get('closed-contracts/:id/archive-data')
  @UseGuards(JwtAuthGuard)
  async getMyClosedContractArchive(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    await this.assertContractOwnership(id, customerId);
    return this.contractService.getContractArchiveData(id);
  }
}
