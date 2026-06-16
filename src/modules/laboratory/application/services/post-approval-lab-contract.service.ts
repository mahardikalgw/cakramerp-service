import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PostApprovalLabContract, LabContractSample } from '../../domain/entities/post-approval-lab-contract.entity';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import type { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../domain/repositories/testing-service-repository.port';
import type { SampleQuotaRepositoryPort } from '../../domain/repositories/sample-quota-repository.port';
import { SAMPLE_QUOTA_REPOSITORY } from '../../domain/repositories/sample-quota-repository.port';
import type { SampleRepositoryPort } from '../../domain/repositories/sample-repository.port';
import { SAMPLE_REPOSITORY } from '../../domain/repositories/sample-repository.port';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import type { LabContractSampleRepositoryPort } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import { LabActivityLogService } from './lab-activity-log.service';
import { NotificationEventService } from './notification-event.service';
import { CUSTOMER_REPOSITORY } from '../../../customer/domain/repositories/customer-repository.port';
import type { CustomerRepositoryPort } from '../../../customer/domain/repositories/customer-repository.port';

@Injectable()
export class PostApprovalLabContractService {
  private readonly logger = new Logger(PostApprovalLabContractService.name);

  constructor(
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly repository: PostApprovalLabContractRepositoryPort,
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly requestRepo: TestingRequestRepositoryPort,
    @Inject(TESTING_SERVICE_REPOSITORY)
    private readonly testingServiceRepo: TestingServiceRepositoryPort,
    @Inject(SAMPLE_QUOTA_REPOSITORY)
    private readonly sampleQuotaRepo: SampleQuotaRepositoryPort,
    @Inject(SAMPLE_REPOSITORY)
    private readonly sampleRepo: SampleRepositoryPort,
    @Inject(LAB_CONTRACT_SAMPLE_REPOSITORY)
    private readonly contractSampleRepo: LabContractSampleRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioService: MinioClientService,
    private readonly activityLog: LabActivityLogService,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    private readonly notificationEventService: NotificationEventService,
  ) {}

  async findAll(options?: { status?: string; customerId?: string; page?: number; limit?: number }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;
    return this.repository.findAll({ filters, page: options?.page, limit: options?.limit });
  }

  async findById(id: string): Promise<PostApprovalLabContract | null> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    try {
      (contract as any).sampleLines = await this.contractSampleRepo.findByContractId(id);
    } catch {}
    return contract;
  }

  async findByTestingRequestId(testingRequestId: string): Promise<PostApprovalLabContract | null> {
    return this.repository.findByTestingRequestId(testingRequestId);
  }

  private generateContractNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/CTR-(\d{4})-(\d+)/);
      if (match) seq = parseInt(match[2], 10) + 1;
    }
    return `CTR-${year}-${String(seq).padStart(5, '0')}`;
  }

  async generateFromTestingRequest(
    testingRequestId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<PostApprovalLabContract> {
    const request = await this.requestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (!request.quotaGranted) throw new BadRequestException('Quota has not been granted yet');

    const existing = await this.repository.findByTestingRequestId(testingRequestId);
    if (existing) return existing;

    const quotas = await this.sampleQuotaRepo.findByTestingRequestId(testingRequestId);
    if (quotas.length === 0) throw new BadRequestException('No quota data found for this request');

    const totalQuota = quotas.reduce((sum, q) => sum + q.totalQuota, 0);

    let baseAmount = 0;
    const sampleLines: Record<string, any>[] = [];
    const docLines: Record<string, any>[] = [];
    const taxDocLines: Record<string, any>[] = [];

    // Query actual samples created for this testing request
    const samples = await this.sampleRepo.findByTestingRequestId(testingRequestId);
    const samplesOrdered = [...samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (let i = 0; i < (request.lines || []).length; i++) {
      const line = request.lines![i];
      // Match sample by sampleCode, fallback to index match
      const sample =
        (line.sampleCode
          ? samplesOrdered.find((s) => s.sampleCode === line.sampleCode)
          : null) ?? samplesOrdered[i] ?? null;

      let unitPrice = 0;
      if (line.testingServiceId) {
        try {
          const service = await this.testingServiceRepo.findById(line.testingServiceId);
          if (service) unitPrice = service.unitPrice ?? 0;
        } catch {}
      }
      const quantity = line.sampleQuantity ?? 0;
      const totalPrice = unitPrice * quantity;
      baseAmount += totalPrice;

      sampleLines.push({
        sampleId: sample?.id ?? null,
        testingServiceId: line.testingServiceId,
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode,
        sampleDescription: line.sampleDescription,
        sampleQuantity: quantity,
        unitPrice,
        totalPrice,
        status: 'pending',
      });

      docLines.push({
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode ?? '-',
        sampleDescription: line.sampleDescription || '',
        sampleQuantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });

      taxDocLines.push({
        description: line.serviceName || 'Unknown Service',
        quantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });
    }

    const taxPercent = 11;
    const taxAmount = Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
    const totalAmount = baseAmount + taxAmount;

    const lastNumber = await this.repository.getLastContractNumber();
    const contractNumber = this.generateContractNumber(lastNumber);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const contract = new PostApprovalLabContract({
      contractNumber,
      testingRequestId: request.id,
      customerId: request.customerId,
      customerName: request.customerName || '',
      projectName: request.projectName,
      projectLocation: request.projectLocation,
      testingType: request.testingType,
      billingType: request.billingType,
      totalQuota,
      usedQuota: 0,
      remainingQuota: totalQuota,
      baseAmount,
      taxPercent,
      taxAmount,
      totalAmount,
      status: 'active',
      generatedAt: new Date(),
      generatedBy: adminUserId,
      generatedByName: adminUserName,
      expiresAt,
    });

    const saved = await this.repository.save(contract);

    for (const sl of sampleLines) {
      const entity = new LabContractSample({
        ...(sl as any),
        contractId: saved.id,
        status: 'pending',
      });

      if (entity.sampleId) {
        const sample = await this.sampleRepo.findById(entity.sampleId);
        if (sample?.quantity != null) {
          const existingContractSamples = await this.contractSampleRepo.findBySampleId(entity.sampleId);
          const existingTotal = existingContractSamples.reduce((sum, cs) => sum + (cs.sampleQuantity ?? 0), 0);
          const newTotal = existingTotal + (entity.sampleQuantity ?? 0);
          if (newTotal > sample.quantity) {
            throw new BadRequestException(
              `Sample ${sample.sampleCode} quantity (${sample.quantity}) exceeded by contract allocations (${newTotal})`,
            );
          }
        }
      }

      await this.contractSampleRepo.save(entity);
    }

    request.labContractId = saved.id;
    await this.requestRepo.save(request);

    try {
      const contractDoc = await this.docHelper.generateDocument({
        documentType: 'lab_contract',
        entityId: saved.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          contractNumber: saved.contractNumber,
          customerName: saved.customerName,
          customerAddress: request.projectLocation || '-',
          projectName: saved.projectName || '-',
          projectLocation: saved.projectLocation || '-',
          testingType: saved.testingType || '-',
          billingType: saved.billingType || '-',
          totalQuota: String(totalQuota),
          usedQuota: '0',
          remainingQuota: String(totalQuota),
          baseAmount: baseAmount.toLocaleString('id-ID'),
          taxPercent: `${taxPercent}%`,
          taxAmount: taxAmount.toLocaleString('id-ID'),
          totalAmount: totalAmount.toLocaleString('id-ID'),
          generatedAt: new Date().toISOString().split('T')[0],
          generatedByName: adminUserName || 'Admin',
          expiresAt: expiresAt.toISOString().split('T')[0],
        },
        lines: docLines,
      });

      saved.contractDocumentUrl = contractDoc.id;
    } catch (err: any) {
      this.logger.error(`Contract document generation failed: ${err?.message}`, err?.stack);
    }

    try {
      const taxDoc = await this.docHelper.generateDocument({
        documentType: 'lab_tax_invoice',
        entityId: saved.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `INV-${saved.contractNumber}`,
          customerName: saved.customerName,
          customerAddress: request.projectLocation || '-',
          customerNpwp: '-',
          baseAmount: baseAmount.toLocaleString('id-ID'),
          taxPercent: `${taxPercent}%`,
          taxAmount: taxAmount.toLocaleString('id-ID'),
          totalAmount: totalAmount.toLocaleString('id-ID'),
          invoiceDate: new Date().toISOString().split('T')[0],
          supplierName: 'Cakra ERP Laboratory',
          supplierNpwp: '-',
          supplierAddress: '-',
        },
        lines: taxDocLines,
      });

      saved.taxInvoiceUrl = taxDoc.id;
    } catch (err: any) {
      this.logger.error(`Tax invoice generation failed: ${err?.message}`, err?.stack);
    }

    const saved2 = await this.repository.save(saved);

    void this.activityLog.log({
      testingRequestId,
      action: 'lab_contract_generated',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: { contractId: saved2.id, contractNumber: saved2.contractNumber },
    });

    try {
      const customer = await this.customerRepo.findById(saved2.customerId);
      const customerUserId = (customer as any)?.userId;
      if (customerUserId) {
        void this.notificationEventService.onContractGenerated(saved2, customerUserId).catch(() => {});
      }
    } catch {}

    return saved2;
  }

  async generateForContractRequest(
    testingRequestId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<PostApprovalLabContract> {
    const request = await this.requestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');

    const existing = await this.repository.findByTestingRequestId(testingRequestId);
    if (existing) return existing;

    const lastNumber = await this.repository.getLastContractNumber();
    const contractNumber = this.generateContractNumber(lastNumber);

    let baseAmount = 0;
    const docLines: Record<string, any>[] = [];
    const taxDocLines: Record<string, any>[] = [];
    const sampleLines: Record<string, any>[] = [];

    const samples = await this.sampleRepo.findByTestingRequestId(testingRequestId);
    const samplesOrdered = [...samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (let i = 0; i < (request.lines || []).length; i++) {
      const line = request.lines![i];
      const sample =
        (line.sampleCode
          ? samplesOrdered.find((s) => s.sampleCode === line.sampleCode)
          : null) ?? samplesOrdered[i] ?? null;

      let unitPrice = 0;
      if (line.testingServiceId) {
        try {
          const service = await this.testingServiceRepo.findById(line.testingServiceId);
          if (service) unitPrice = service.unitPrice ?? 0;
        } catch {}
      }
      const quantity = line.sampleQuantity ?? 0;
      const totalPrice = unitPrice * quantity;
      baseAmount += totalPrice;

      sampleLines.push({
        sampleId: sample?.id ?? null,
        testingServiceId: line.testingServiceId,
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode,
        sampleDescription: line.sampleDescription,
        sampleQuantity: quantity,
        unitPrice,
        totalPrice,
        status: 'pending',
      });

      docLines.push({
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode ?? '-',
        sampleDescription: line.sampleDescription || '',
        sampleQuantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });

      taxDocLines.push({
        description: line.serviceName || 'Unknown Service',
        quantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });
    }

    const taxPercent = 11;
    const taxAmount = Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
    const totalAmount = baseAmount + taxAmount;

    const tempoMonths = request.contractTempoMonths ?? 6;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + tempoMonths);

    const contract = new PostApprovalLabContract({
      contractNumber,
      testingRequestId: request.id,
      customerId: request.customerId,
      customerName: request.customerName || '',
      projectName: request.projectName,
      projectLocation: request.projectLocation,
      testingType: request.testingType,
      billingType: request.billingType,
      totalQuota: -1,
      usedQuota: 0,
      remainingQuota: -1,
      baseAmount,
      taxPercent,
      taxAmount,
      totalAmount,
      status: 'awaiting_signature',
      generatedAt: new Date(),
      generatedBy: adminUserId,
      generatedByName: adminUserName,
      expiresAt,
      isUnlimited: true,
      scopeOfTesting: request.scopeOfTesting ?? null,
      contractEstimation: request.contractEstimation ?? null,
      contractTempoMonths: request.contractTempoMonths ?? null,
    });

    const saved = await this.repository.save(contract);

    for (const sl of sampleLines) {
      const entity = new LabContractSample({
        ...(sl as any),
        contractId: saved.id,
        status: 'pending',
      });
      await this.contractSampleRepo.save(entity);
    }

    request.labContractId = saved.id;
    await this.requestRepo.save(request);

    try {
      const contractDoc = await this.docHelper.generateDocument({
        documentType: 'lab_contract',
        entityId: saved.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          contractNumber: saved.contractNumber,
          customerName: saved.customerName,
          customerAddress: request.projectLocation || '-',
          projectName: saved.projectName || '-',
          projectLocation: saved.projectLocation || '-',
          testingType: saved.testingType || '-',
          billingType: saved.billingType || '-',
          totalQuota: 'Unlimited',
          usedQuota: '0',
          remainingQuota: 'Unlimited',
          baseAmount: baseAmount.toLocaleString('id-ID'),
          taxPercent: `${taxPercent}%`,
          taxAmount: taxAmount.toLocaleString('id-ID'),
          totalAmount: totalAmount.toLocaleString('id-ID'),
          generatedAt: new Date().toISOString().split('T')[0],
          generatedByName: adminUserName || 'Admin',
          expiresAt: expiresAt.toISOString().split('T')[0],
          scopeOfTesting: request.scopeOfTesting || '-',
          contractEstimation: String(request.contractEstimation ?? '-'),
          contractTempoMonths: String(tempoMonths),
          paymentTerms: 'Monthly per-sample billing on 25th of each month',
          contractTerm: `${tempoMonths} months from signing`,
        },
        lines: docLines,
      });
      saved.contractDocumentUrl = contractDoc.id;
    } catch (err: any) {
      this.logger.error(`Contract document generation failed: ${err?.message}`, err?.stack);
    }

    try {
      const taxDoc = await this.docHelper.generateDocument({
        documentType: 'lab_tax_invoice',
        entityId: saved.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `INV-${saved.contractNumber}`,
          customerName: saved.customerName,
          customerAddress: request.projectLocation || '-',
          customerNpwp: '-',
          baseAmount: baseAmount.toLocaleString('id-ID'),
          taxPercent: `${taxPercent}%`,
          taxAmount: taxAmount.toLocaleString('id-ID'),
          totalAmount: totalAmount.toLocaleString('id-ID'),
          invoiceDate: new Date().toISOString().split('T')[0],
          supplierName: 'Cakra ERP Laboratory',
          supplierNpwp: '-',
          supplierAddress: '-',
        },
        lines: taxDocLines,
      });
      saved.taxInvoiceUrl = taxDoc.id;
    } catch (err: any) {
      this.logger.error(`Tax invoice generation failed: ${err?.message}`, err?.stack);
    }

    const saved2 = await this.repository.save(saved);

    void this.activityLog.log({
      testingRequestId,
      action: 'lab_contract_generated',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: { contractId: saved2.id, contractNumber: saved2.contractNumber },
    });

    return saved2;
  }

  async updateStatus(id: string, status: string): Promise<PostApprovalLabContract> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    contract.status = status as any;
    return this.repository.save(contract);
  }

  async regenerateDocuments(
    contractId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<PostApprovalLabContract> {
    const contract = await this.repository.findById(contractId);
    if (!contract) throw new NotFoundException('Lab contract not found');

    const request = await this.requestRepo.findById(contract.testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');

    const docLines: Record<string, any>[] = [];
    const taxDocLines: Record<string, any>[] = [];

    const samples = await this.sampleRepo.findByTestingRequestId(contract.testingRequestId);
    const samplesOrdered = [...samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (let i = 0; i < (request.lines || []).length; i++) {
      const line = request.lines![i];
      const sample =
        (line.sampleCode
          ? samplesOrdered.find((s) => s.sampleCode === line.sampleCode)
          : null) ?? samplesOrdered[i] ?? null;

      let unitPrice = 0;
      if (line.testingServiceId) {
        try {
          const service = await this.testingServiceRepo.findById(line.testingServiceId);
          if (service) unitPrice = service.unitPrice ?? 0;
        } catch {}
      }
      const quantity = line.sampleQuantity ?? 0;
      const totalPrice = unitPrice * quantity;

      docLines.push({
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode ?? '-',
        sampleDescription: line.sampleDescription || '',
        sampleQuantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });

      taxDocLines.push({
        description: line.serviceName || 'Unknown Service',
        quantity: String(quantity),
        unitPrice: unitPrice.toLocaleString('id-ID'),
        totalPrice: totalPrice.toLocaleString('id-ID'),
      });
    }

    try {
      const contractDoc = await this.docHelper.generateDocument({
        documentType: 'lab_contract',
        entityId: contract.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          contractNumber: contract.contractNumber,
          customerName: contract.customerName,
          customerAddress: request.projectLocation || '-',
          projectName: contract.projectName || '-',
          projectLocation: contract.projectLocation || '-',
          testingType: contract.testingType || '-',
          billingType: contract.billingType || '-',
          totalQuota: String(contract.totalQuota),
          usedQuota: String(contract.usedQuota),
          remainingQuota: String(contract.remainingQuota),
          baseAmount: contract.baseAmount.toLocaleString('id-ID'),
          taxPercent: `${contract.taxPercent}%`,
          taxAmount: contract.taxAmount.toLocaleString('id-ID'),
          totalAmount: contract.totalAmount.toLocaleString('id-ID'),
          generatedAt: (contract.generatedAt ?? new Date()).toISOString().split('T')[0],
          generatedByName: adminUserName || 'Admin',
          expiresAt: contract.expiresAt
            ? contract.expiresAt.toISOString().split('T')[0]
            : '-',
        },
        lines: docLines,
      });
      contract.contractDocumentUrl = contractDoc.id;
      this.logger.log(`Contract document regenerated: ${contractDoc.id}`);
    } catch (err: any) {
      this.logger.error(`Contract document regeneration failed: ${err?.message}`, err?.stack);
    }

    try {
      const taxDoc = await this.docHelper.generateDocument({
        documentType: 'lab_tax_invoice',
        entityId: contract.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `INV-${contract.contractNumber}`,
          customerName: contract.customerName,
          customerAddress: request.projectLocation || '-',
          customerNpwp: '-',
          baseAmount: contract.baseAmount.toLocaleString('id-ID'),
          taxPercent: `${contract.taxPercent}%`,
          taxAmount: contract.taxAmount.toLocaleString('id-ID'),
          totalAmount: contract.totalAmount.toLocaleString('id-ID'),
          invoiceDate: new Date().toISOString().split('T')[0],
          supplierName: 'Cakra ERP Laboratory',
          supplierNpwp: '-',
          supplierAddress: '-',
        },
        lines: taxDocLines,
      });
      contract.taxInvoiceUrl = taxDoc.id;
      this.logger.log(`Tax invoice regenerated: ${taxDoc.id}`);
    } catch (err: any) {
      this.logger.error(`Tax invoice regeneration failed: ${err?.message}`, err?.stack);
    }

    return this.repository.save(contract);
  }

  async getContractDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (!contract.contractDocumentUrl) throw new NotFoundException('Contract document not yet generated');
    const url = await this.docHelper.getDownloadUrl(contract.contractDocumentUrl);
    if (!url) throw new NotFoundException('Contract document URL is not available');
    return { url, filename: `${contract.contractNumber}_contract.pdf` };
  }

  async getTaxInvoiceDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (!contract.taxInvoiceUrl) throw new NotFoundException('Tax invoice not yet generated');
    const url = await this.docHelper.getDownloadUrl(contract.taxInvoiceUrl);
    if (!url) throw new NotFoundException('Tax invoice URL is not available');
    return { url, filename: `${contract.contractNumber}_tax_invoice.pdf` };
  }
}