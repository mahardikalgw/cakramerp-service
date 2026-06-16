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

  private async assertContractOwnership(contractId: string, customerId: string): Promise<any> {
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const result = await this.contractService.findAll({
      customerId,
      status,
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
    const pendingBySample = await this.scheduleService.getPendingAllocationsBySample(id);
    const sampleLines = ((contract as any).sampleLines ?? []).map((s: any) => ({
      ...s,
      pendingQuantity: pendingBySample[s.id] || 0,
    }));
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
    @Body() body: {
      scheduledDate: string;
      scheduledTime?: string;
      scheduledLocation?: string;
      notes?: string;
      sampleAllocations: Array<{ contractSampleId: string; allocatedQuantity: number }>;
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
    const contract = await this.assertContractOwnership(schedule.contractId, customerId);
    return { ...schedule, contractNumber: contract.contractNumber, projectName: contract.projectName };
  }

  @Get('schedules/:id/samples')
  @UseGuards(JwtAuthGuard)
  async getScheduleSamples(@Req() req: any, @Param('id') id: string) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const schedule = await this.scheduleService.findById(id);
    if (!schedule) throw new NotFoundException('Testing schedule not found');
    const contract = await this.assertContractOwnership(schedule.contractId, customerId);
    const result = await this.scheduleService.getScheduleWithSamples(id);
    return {
      schedule: { ...result.schedule, contractNumber: contract.contractNumber, projectName: contract.projectName },
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
    return this.testingResultService.findById(id);
  }

  @Patch('testing-results/:id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmResult(@Req() req: any, @Param('id') id: string) {
    return this.testingResultService.confirmByCustomer(id, req.user.id, req.user.name);
  }

  @Get('testing-results/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadResultCertificate(@Param('id') id: string): Promise<{ url: string }> {
    const result = await this.testingResultService.findById(id);
    if (!result?.certificateDocumentId) {
      throw new NotFoundException('Certificate not generated yet');
    }
    const url = await this.docHelper.getDownloadUrl(result.certificateDocumentId);
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

  @Post('testing-requests/:id/upload-signed-contract-file')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadSignedContractFile(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.portalService.uploadSignedContract(req.user.id, id, file);
  }

  @Get('testing-requests/:id/download-contract')
  @UseGuards(JwtAuthGuard)
  async downloadContractDocument(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const customerId = await this.resolveCustomerId(req.user.id);
    const request = await this.testingRequestService.findById(id);
    if (!request) throw new NotFoundException('Testing request not found');
    if ((request as any).customerId !== customerId) throw new ForbiddenException('Access denied');
    if ((request as any).labContractId) {
      return this.contractService.getContractDownloadUrl((request as any).labContractId);
    }
    throw new NotFoundException('Contract document not found');
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
    const contracts = await this.contractService.findAll({ customerId: customerId as any });
    const allInvoices: any[] = [];
    for (const contract of contracts.data) {
      const invoices = await this.contractInvoiceService.findByContractId(contract.id);
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
}