import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PostApprovalLabContract,
  LabContractSample,
} from '../../domain/entities/post-approval-lab-contract.entity';
import { Sample } from '../../domain/entities/sample.entity';
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
import type { PostApprovalTestingScheduleRepositoryPort } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import { POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY } from '../../domain/repositories/post-approval-testing-schedule-repository.port';
import type { PostApprovalTestingResultRepositoryPort } from '../../domain/repositories/post-approval-testing-result-repository.port';
import { POST_APPROVAL_TESTING_RESULT_REPOSITORY } from '../../domain/repositories/post-approval-testing-result-repository.port';
import type { PostApprovalTestingResult } from '../../domain/entities/post-approval-testing-result.entity';

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
    @Inject(POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY)
    private readonly scheduleRepo: PostApprovalTestingScheduleRepositoryPort,
    @Inject(POST_APPROVAL_TESTING_RESULT_REPOSITORY)
    private readonly testingResultRepo: PostApprovalTestingResultRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;
    return this.repository.findAll({
      filters,
      search: options?.search,
      page: options?.page,
      limit: options?.limit,
    });
  }
  async findById(id: string): Promise<PostApprovalLabContract | null> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    try {
      (contract as any).sampleLines =
        await this.contractSampleRepo.findByContractId(id);
    } catch {
      /* ignore */
    }
    return contract;
  }

  async findByTestingRequestId(
    testingRequestId: string,
  ): Promise<PostApprovalLabContract | null> {
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
    // Use PostgreSQL advisory lock to prevent race conditions when generating
    // contract numbers. The lock key is a stable integer derived from the
    // string "contract_number_generation".
    const LOCK_KEY = 7_432_918; // arbitrary stable int for this lock
    await this.dataSource.query(`SELECT pg_advisory_lock($1)`, [LOCK_KEY]);
    try {
      return await this._generateFromTestingRequestInner(
        testingRequestId,
        adminUserId,
        adminUserName,
      );
    } finally {
      await this.dataSource.query(`SELECT pg_advisory_unlock($1)`, [LOCK_KEY]);
    }
  }

  private async _generateFromTestingRequestInner(
    testingRequestId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<PostApprovalLabContract> {
    const request = await this.requestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (!request.quotaGranted)
      throw new BadRequestException('Quota has not been granted yet');

    const existing =
      await this.repository.findByTestingRequestId(testingRequestId);
    if (existing) return existing;

    const quotas =
      await this.sampleQuotaRepo.findByTestingRequestId(testingRequestId);
    if (quotas.length === 0)
      throw new BadRequestException('No quota data found for this request');

    const totalQuota = quotas.reduce((sum, q) => sum + q.totalQuota, 0);

    let baseAmount = 0;
    const sampleLines: Record<string, any>[] = [];
    const docLines: Record<string, any>[] = [];
    const taxDocLines: Record<string, any>[] = [];

    // Query actual samples created for this testing request
    const samples =
      await this.sampleRepo.findByTestingRequestId(testingRequestId);
    const samplesOrdered = [...samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (let i = 0; i < (request.lines || []).length; i++) {
      const line = request.lines![i];
      // Match sample by sampleCode, fallback to index match
      const sample =
        (line.sampleCode
          ? samplesOrdered.find((s) => s.sampleCode === line.sampleCode)
          : null) ??
        samplesOrdered[i] ??
        null;

      const quantity = line.sampleQuantity ?? 0;
      const unitPrice = Number(line.unitPrice ?? 0);
      const totalPrice = unitPrice * quantity;
      baseAmount += totalPrice;

      sampleLines.push({
        sampleId: sample?.id ?? null,
        testingServiceId: line.testingServiceId,
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode,
        sampleQuantity: quantity,
        unitPrice,
        totalPrice,
        status: 'pending',
      });

      docLines.push({
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode ?? '-',
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

    const taxPercent = request.taxPercent ?? 0;
    const taxAmount = Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
    const totalAmount = baseAmount + taxAmount;

    const contractNumber = await this.repository.generateNextContractNumber();

    // Cash billing: contract valid for 3 months (customer already paid in full).
    // Contract billing: use tempo days from request, default to 6 months.
    const isCash = (request.billingType ?? 'cash') === 'cash';
    const effectiveTempoDays = request.contractTempoDays ?? (isCash ? 90 : 180);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + effectiveTempoDays);

    const contract = new PostApprovalLabContract({
      contractNumber,
      testingRequestId: request.id,
      customerId: request.customerId,
      customerName: request.customerName || '',
      projectName: request.projectName,
      projectLocation: request.projectLocation,
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
      // For contract billing, lock the scope to only services from the request lines
      allowedServiceIds:
        request.billingType === 'contract' && (request.lines ?? []).length > 0
          ? [
              ...new Set(
                (request.lines ?? [])
                  .filter((l) => l.testingServiceId)
                  .map((l) => l.testingServiceId!),
              ),
            ]
          : null,
    });

    const saved = await this.repository.save(contract);

    for (const sl of sampleLines) {
      if (!sl.sampleId) continue;

      const entity = new LabContractSample({
        ...(sl as any),
        contractId: saved.id,
        status: 'pending',
      });

      if (entity.sampleId) {
        const sample = await this.sampleRepo.findById(entity.sampleId);
        if (sample?.quantity != null) {
          const existingContractSamples =
            await this.contractSampleRepo.findBySampleId(entity.sampleId);
          const existingTotal = existingContractSamples.reduce(
            (sum, cs) => sum + (cs.sampleQuantity ?? 0),
            0,
          );
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
          billingType: saved.billingType || '-',
          isCash: isCash ? 'true' : 'false',
          contractTerm: isCash
            ? '3 months from approval date'
            : '6 months from signing',
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
      this.logger.error(
        `Contract document generation failed: ${err?.message}`,
        err?.stack,
      );
    }

    // Invoice only for contract billing — cash customers paid in full up front.
    if (!isCash) {
      try {
        const taxDoc = await this.docHelper.generateDocument({
          documentType: 'lab_invoice',
          entityId: saved.id,
          requestedBy: adminUserId,
          outputFormat: 'pdf',
          parameters: {
            invoiceNumber: `INV-${saved.contractNumber}`,
            customerName: saved.customerName,
            customerAddress: request.projectLocation || '-',
            subtotal: baseAmount.toLocaleString('id-ID'),
            taxPercent: String(taxPercent),
            taxAmount: taxAmount.toLocaleString('id-ID'),
            totalAmount: totalAmount.toLocaleString('id-ID'),
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 7 * 86400000)
              .toISOString()
              .split('T')[0],
            status: 'issued',
            authorizedByName: adminUserName || 'Lab Authorized',
          },
          lines: taxDocLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.totalPrice,
          })),
        });

        saved.taxInvoiceUrl = taxDoc.id;
      } catch (err: any) {
        this.logger.error(
          `Tax invoice generation failed: ${err?.message}`,
          err?.stack,
        );
      }
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
        void this.notificationEventService
          .onContractGenerated(saved2, customerUserId)
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }

    return saved2;
  }

  async generateForContractRequest(
    testingRequestId: string,
    adminUserId: string,
    adminUserName?: string,
    downPaymentAmount?: number,
  ): Promise<PostApprovalLabContract> {
    const request = await this.requestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');

    const existing =
      await this.repository.findByTestingRequestId(testingRequestId);
    if (existing) return existing;

    const lastNumber = await this.repository.getLastContractNumber();
    const contractNumber = this.generateContractNumber(lastNumber);

    const baseAmount =
      downPaymentAmount && downPaymentAmount > 0 ? downPaymentAmount : 0;
    const taxPercent = request.taxPercent ?? 0;
    const taxAmount = Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

    const tempoDays = request.contractTempoDays ?? 180;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + tempoDays);

    const allowedServiceIds = request.scopeOfTestingServiceIds?.length
      ? request.scopeOfTestingServiceIds
      : request.billingType === 'contract' && (request.lines ?? []).length > 0
        ? [
            ...new Set(
              (request.lines ?? [])
                .filter((l) => l.testingServiceId)
                .map((l) => l.testingServiceId!),
            ),
          ]
        : null;

    const contract = new PostApprovalLabContract({
      contractNumber,
      testingRequestId: request.id,
      customerId: request.customerId,
      customerName: request.customerName || '',
      projectName: request.projectName,
      projectLocation: request.projectLocation,
      billingType: request.billingType,
      totalQuota: -1,
      usedQuota: 0,
      remainingQuota: -1,
      baseAmount,
      taxPercent,
      taxAmount,
      totalAmount,
      // Initial fee = the upfront down-payment base amount, excluding tax.
      initialFee: baseAmount,
      status: 'active',
      generatedAt: new Date(),
      generatedBy: adminUserId,
      generatedByName: adminUserName,
      expiresAt,
      isUnlimited: true,
      scopeOfTesting: request.scopeOfTesting ?? null,
      contractEstimation: request.contractEstimation ?? null,
      contractTempoDays: request.contractTempoDays ?? null,
      allowedServiceIds,
    });

    const saved = await this.repository.save(contract);

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
          billingType: saved.billingType || '-',
          isCash: 'false',
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
          contractTempoDays: String(tempoDays),
          downPaymentAmount: baseAmount.toLocaleString('id-ID'),
          dpDueDate:
            baseAmount > 0
              ? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
              : '',
          paymentTerms: 'Down payment required before contract activation',
          contractTerm: `${tempoDays} days from activation`,
          customerSignatureName: saved.customerName || 'Customer',
          labSignatureName: adminUserName || 'Lab Authorized',
        },
        lines: [],
      });
      saved.contractDocumentUrl = contractDoc.id;
    } catch (err: any) {
      this.logger.error(
        `Contract document generation failed: ${err?.message}`,
        err?.stack,
      );
    }

    try {
      const taxDoc = await this.docHelper.generateDocument({
        documentType: 'lab_invoice',
        entityId: saved.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `INV-${saved.contractNumber}`,
          customerName: saved.customerName,
          customerAddress: request.projectLocation || '-',
          subtotal: baseAmount.toLocaleString('id-ID'),
          taxPercent: String(taxPercent),
          taxAmount: taxAmount.toLocaleString('id-ID'),
          totalAmount: totalAmount.toLocaleString('id-ID'),
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .split('T')[0],
          status: 'issued',
          authorizedByName: adminUserName || 'Lab Authorized',
        },
        lines: [
          {
            description: `Down Payment — Contract Testing (${saved.projectName || '-'})`,
            quantity: '1',
            unitPrice: baseAmount.toLocaleString('id-ID'),
            total: baseAmount.toLocaleString('id-ID'),
          },
        ],
      });
      saved.taxInvoiceUrl = taxDoc.id;
      request.invoiceDocumentUrl = taxDoc.id;
      request.downPaymentAmount = baseAmount;
      await this.requestRepo.save(request);
      this.logger.log(`Tax/DP invoice generated: ${taxDoc.id}`);
    } catch (err: any) {
      this.logger.error(
        `Tax invoice generation failed: ${err?.message}`,
        err?.stack,
      );
    }

    const savedFinal = await this.repository.save(saved);

    void this.activityLog.log({
      testingRequestId,
      action: 'lab_contract_generated',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: {
        contractId: savedFinal.id,
        contractNumber: savedFinal.contractNumber,
      },
    });

    return savedFinal;
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<PostApprovalLabContract> {
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

    const samples = await this.sampleRepo.findByTestingRequestId(
      contract.testingRequestId,
    );
    const samplesOrdered = [...samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (let i = 0; i < (request.lines || []).length; i++) {
      const line = request.lines![i];
      const sample =
        (line.sampleCode
          ? samplesOrdered.find((s) => s.sampleCode === line.sampleCode)
          : null) ??
        samplesOrdered[i] ??
        null;

      const quantity = line.sampleQuantity ?? 0;
      const unitPrice = Number(line.unitPrice ?? 0);
      const totalPrice = unitPrice * quantity;

      docLines.push({
        serviceName: line.serviceName || 'Unknown Service',
        sampleCode: sample?.sampleCode ?? line.sampleCode ?? '-',
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
          billingType: contract.billingType || '-',
          totalQuota: String(contract.totalQuota),
          usedQuota: String(contract.usedQuota),
          remainingQuota: String(contract.remainingQuota),
          baseAmount: contract.baseAmount.toLocaleString('id-ID'),
          taxPercent: `${contract.taxPercent}%`,
          taxAmount: contract.taxAmount.toLocaleString('id-ID'),
          totalAmount: contract.totalAmount.toLocaleString('id-ID'),
          generatedAt: (contract.generatedAt ?? new Date())
            .toISOString()
            .split('T')[0],
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
      this.logger.error(
        `Contract document regeneration failed: ${err?.message}`,
        err?.stack,
      );
    }

    try {
      const taxDoc = await this.docHelper.generateDocument({
        documentType: 'lab_invoice',
        entityId: contract.id,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `INV-${contract.contractNumber}`,
          customerName: contract.customerName,
          customerAddress: request.projectLocation || '-',
          subtotal: contract.baseAmount.toLocaleString('id-ID'),
          taxPercent: String(contract.taxPercent),
          taxAmount: contract.taxAmount.toLocaleString('id-ID'),
          totalAmount: contract.totalAmount.toLocaleString('id-ID'),
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .split('T')[0],
          status: 'issued',
          authorizedByName: adminUserName || 'Lab Authorized',
        },
        lines: taxDocLines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.totalPrice,
        })),
      });
      contract.taxInvoiceUrl = taxDoc.id;
      this.logger.log(`Tax invoice regenerated: ${taxDoc.id}`);
    } catch (err: any) {
      this.logger.error(
        `Tax invoice regeneration failed: ${err?.message}`,
        err?.stack,
      );
    }

    return this.repository.save(contract);
  }

  async getContractDownloadUrl(
    id: string,
  ): Promise<{ url: string; filename: string }> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (!contract.contractDocumentUrl)
      throw new NotFoundException('Contract document not yet generated');
    const url = await this.docHelper.getDownloadUrl(
      contract.contractDocumentUrl,
    );
    if (!url)
      throw new NotFoundException('Contract document URL is not available');
    return { url, filename: `${contract.contractNumber}_contract.pdf` };
  }

  async getTaxInvoiceDownloadUrl(
    id: string,
  ): Promise<{ url: string; filename: string }> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (!contract.taxInvoiceUrl)
      throw new NotFoundException('Tax invoice not yet generated');
    const url = await this.docHelper.getDownloadUrl(contract.taxInvoiceUrl);
    if (!url) throw new NotFoundException('Tax invoice URL is not available');
    return { url, filename: `${contract.contractNumber}_tax_invoice.pdf` };
  }

  /**
   * Close a completed cash contract before its expiry date.
   * Sets status = 'closed' and records closure metadata.
   * Only allowed for cash billing contracts with status 'completed'.
   */
  async closeContract(
    id: string,
    adminUserId: string,
    adminUserName: string,
  ): Promise<PostApprovalLabContract> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');

    // Status prerequisites differ by billing type:
    //   - Cash contracts run to 'completed' on their own (every sample done)
    //     and require that state before an admin can close them.
    //   - Contract/unlimited contracts never auto-complete; admin can close
    //     them directly from 'active'.
    if (contract.billingType === 'cash') {
      if (contract.status !== 'completed') {
        throw new BadRequestException(
          `Cash contract must be completed before it can be closed. Current status: ${contract.status}`,
        );
      }
    } else {
      if (contract.status !== 'active') {
        throw new BadRequestException(
          `Contract must be active to be closed. Current status: ${contract.status}`,
        );
      }
    }

    contract.status = 'closed';
    contract.closedAt = new Date();
    contract.closedBy = adminUserId;
    contract.closedByName = adminUserName;

    const saved = await this.repository.save(contract);

    void this.activityLog
      .log({
        testingRequestId: contract.testingRequestId,
        action: 'contract_closed',
        performedBy: adminUserId,
        performedByName: adminUserName,
        performedByRole: 'admin',
        details: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          closedAt: contract.closedAt,
        },
      })
      .catch(() => {});

    return saved;
  }

  /**
   * Returns all data for a closed contract archive:
   * contract details, schedules, testing results, and downloadable document URLs.
   */
  async getContractArchiveData(
    contractId: string,
  ): Promise<Record<string, any>> {
    const contract = await this.repository.findById(contractId);
    if (!contract) throw new NotFoundException('Lab contract not found');

    const enriched: Record<string, any> = { ...contract };
    enriched.sampleLines = await this.contractSampleRepo
      .findByContractId(contractId)
      .catch(() => []);

    // Schedules for this contract
    const schedules = await this.scheduleRepo
      .findByContractId(contractId)
      .catch(() => []);

    // Testing results grouped by schedule
    const allResults: PostApprovalTestingResult[] = await this.testingResultRepo
      .findByContractId(contractId)
      .catch(() => []);

    // Enrich schedules with their schedule-sample allocations and results
    const scheduleSamples = await Promise.all(
      schedules.map(async (schedule) => {
        // Get schedule samples via the lab-contract-sample repo
        const allocations = await this.contractSampleRepo
          .findByContractId(contractId)
          .then((cs) => cs)
          .catch(() => []);
        const scheduleResults = allResults.filter(
          (r) => r.scheduleId === schedule.id,
        );
        return {
          ...schedule,
          results: scheduleResults,
          allocations,
        };
      }),
    );

    enriched.schedules = scheduleSamples;

    // Build results grouped by schedule
    const resultsBySchedule = schedules.map((schedule) => ({
      scheduleId: schedule.id,
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      scheduledLocation: schedule.scheduledLocation,
      laboranName: schedule.laboranName,
      status: schedule.status,
      results: allResults.filter((r) => r.scheduleId === schedule.id),
    }));
    enriched.resultsBySchedule = resultsBySchedule;

    // Downloadable document URLs
    const documents: Array<{ type: string; filename: string; url?: string }> =
      [];

    if (contract.contractDocumentUrl) {
      try {
        const url = await this.docHelper.getDownloadUrl(
          contract.contractDocumentUrl,
        );
        if (url)
          documents.push({
            type: 'contract',
            filename: `${contract.contractNumber}_contract.pdf`,
            url,
          });
      } catch {
        /* ignore */
      }
    }
    if (contract.taxInvoiceUrl) {
      try {
        const url = await this.docHelper.getDownloadUrl(contract.taxInvoiceUrl);
        if (url)
          documents.push({
            type: 'tax_invoice',
            filename: `${contract.contractNumber}_tax_invoice.pdf`,
            url,
          });
      } catch {
        /* ignore */
      }
    }

    // Collect all certificate documents from results
    await Promise.all(
      allResults.map(async (result) => {
        if (result.certificateDocumentId) {
          try {
            const url = await this.docHelper.getDownloadUrl(
              result.certificateDocumentId,
            );
            if (url)
              documents.push({
                type: 'certificate',
                filename: `certificate_${result.id.substring(0, 8)}.pdf`,
                url,
              });
          } catch {
            /* ignore */
          }
        }
      }),
    );

    enriched.archiveDocuments = documents;

    return enriched;
  }

  /**
   * Step 1 of contract flow: Generate the contract PDF + DP invoice documents only.
   * Does NOT create a PostApprovalLabContract entity.
   * Stores contractDocumentUrl and invoiceDocumentUrl on the testing request.
   * Contract entity is created later when admin confirms DP payment.
   */
  async generateContractDocumentsOnly(
    testingRequestId: string,
    adminUserId: string,
    adminUserName?: string,
    downPaymentAmount?: number,
  ): Promise<void> {
    const request = await this.requestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');

    const lastNumber = await this.repository.getLastContractNumber();
    const draftContractNumber = this.generateContractNumber(lastNumber);

    const baseAmount = request.contractEstimation ?? 0;
    const taxPercent = request.taxPercent ?? 0;
    const taxAmount = Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
    const totalAmount = baseAmount + taxAmount;
    const dpAmount =
      downPaymentAmount && downPaymentAmount > 0
        ? downPaymentAmount
        : totalAmount;
    const tempoDays = request.contractTempoDays ?? 180;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + tempoDays);

    const customer = await this.customerRepo
      .findById(request.customerId)
      .catch(() => null);
    const customerName = (customer as any)?.name || request.customerName || '-';

    // Generate contract PDF document (draft — not yet a contract entity)
    try {
      const contractDoc = await this.docHelper.generateDocument({
        documentType: 'lab_contract',
        entityId: testingRequestId,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          contractNumber: draftContractNumber,
          customerName,
          customerAddress: request.projectLocation || '-',
          projectName: request.projectName || '-',
          projectLocation: request.projectLocation || '-',
          billingType: 'contract',
          isCash: 'false',
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
          contractTempoDays: String(tempoDays),
          downPaymentAmount:
            dpAmount > 0 ? dpAmount.toLocaleString('id-ID') : '',
          dpDueDate:
            dpAmount > 0
              ? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
              : '',
          paymentTerms: 'Down payment required before contract activation',
          contractTerm: `${tempoDays} days from contract activation`,
          customerSignatureName: customerName,
          labSignatureName: adminUserName || 'Lab Authorized',
        },
        lines: [],
      });
      (request as any).contractDocumentUrl = contractDoc.id;
      this.logger.log(`Draft contract PDF generated: ${contractDoc.id}`);
    } catch (err: any) {
      this.logger.error(
        `Draft contract PDF generation failed: ${err?.message}`,
        err?.stack,
      );
      throw err;
    }

    // Generate DP invoice
    try {
      const taxMultiplier = 1 + taxPercent / 100;
      const dpSubtotal =
        taxMultiplier > 0
          ? Math.round((dpAmount / taxMultiplier) * 100) / 100
          : dpAmount;
      const dpTaxAmount = Math.round((dpAmount - dpSubtotal) * 100) / 100;
      const dpInvoiceDoc = await this.docHelper.generateDocument({
        documentType: 'lab_invoice',
        entityId: testingRequestId,
        requestedBy: adminUserId,
        outputFormat: 'pdf',
        parameters: {
          invoiceNumber: `DP-${draftContractNumber}`,
          customerName,
          customerAddress: request.projectLocation || '-',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .split('T')[0],
          subtotal: dpSubtotal,
          taxPercent: String(taxPercent),
          taxAmount: dpTaxAmount,
          totalAmount: dpAmount.toLocaleString('id-ID'),
          status: 'issued',
          authorizedByName: adminUserName || 'Lab Authorized',
        },
        lines: [
          {
            description: `Down Payment — Contract Testing (${request.projectName || '-'})`,
            quantity: '1',
            unitPrice: dpAmount.toLocaleString('id-ID'),
            total: dpAmount.toLocaleString('id-ID'),
          },
        ],
      });
      request.invoiceDocumentUrl = dpInvoiceDoc.id;
      (request as any).downPaymentAmount = dpAmount;
      this.logger.log(`DP invoice generated: ${dpInvoiceDoc.id}`);
    } catch (err: any) {
      this.logger.error(
        `DP invoice generation failed: ${err?.message}`,
        err?.stack,
      );
    }

    await this.requestRepo.save(request);
  }

  /**
   * Add sample lines to an existing contract.
   * Used for contract billing where samples are defined after DP confirmation.
   */
  async addContractSamples(
    contractId: string,
    samples: Array<{
      testingServiceId?: string;
      serviceName: string;
      sampleCode?: string;
      sampleQuantity: number;
    }>,
  ): Promise<LabContractSample[]> {
    const contract = await this.repository.findById(contractId);
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.billingType === 'cash') {
      throw new BadRequestException(
        'Cannot add samples to a cash billing contract',
      );
    }
    if (!['active'].includes(contract.status)) {
      throw new BadRequestException(
        `Cannot add samples to contract with status: ${contract.status}`,
      );
    }

    const created: LabContractSample[] = [];
    for (const s of samples) {
      // Enforce scope — if allowedServiceIds is set, reject services outside scope
      if (
        contract.allowedServiceIds &&
        contract.allowedServiceIds.length > 0 &&
        s.testingServiceId &&
        !contract.allowedServiceIds.includes(s.testingServiceId)
      ) {
        throw new BadRequestException(
          `Testing service ${s.testingServiceId} is not in the scope of this contract. ` +
            `Allowed services: ${contract.allowedServiceIds.join(', ')}`,
        );
      }

      let unitPrice = 0;
      if (s.testingServiceId) {
        try {
          const service = await this.testingServiceRepo.findById(
            s.testingServiceId,
          );
          if (service) unitPrice = service.unitPrice ?? 0;
        } catch {
          /* ignore */
        }
      }
      if (unitPrice === 0) {
        this.logger.warn(
          `[CONTRACT] unitPrice is 0 for sample ${s.serviceName} (service=${s.testingServiceId}). Invoice will be 0 until testing service price is set.`,
        );
      }

      const sampleCode = s.sampleCode || (await this.generateNextSampleCode());
      const sample = await this.sampleRepo.save(
        new Sample({
          sampleCode,
          customerId: contract.customerId,
          customerName: contract.customerName,
          description: null,
          quantity: s.sampleQuantity ?? 1,
          status: 'awaiting_delivery',
        } as any),
      );

      const entity = new LabContractSample({
        contractId,
        sampleId: sample.id,
        testingServiceId: s.testingServiceId ?? null,
        serviceName: s.serviceName,
        sampleCode: sampleCode,
        sampleQuantity: s.sampleQuantity ?? 1,
        unitPrice,
        totalPrice: unitPrice * (s.sampleQuantity ?? 1),
        status: 'pending',
      } as any);
      const saved = await this.contractSampleRepo.save(entity);
      created.push(saved);
    }

    // Update contract total quota if not unlimited
    if (!contract.isUnlimited) {
      const allSamples =
        await this.contractSampleRepo.findByContractId(contractId);
      const newTotal = allSamples.reduce(
        (sum, s) => sum + (s.sampleQuantity ?? 0),
        0,
      );
      contract.totalQuota = newTotal;
      contract.remainingQuota = newTotal - contract.usedQuota;
      await this.repository.save(contract);
    }

    return created;
  }

  async getClosedContracts(options?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: PostApprovalLabContract[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const result = await this.repository.findAll({
      filters: { status: 'closed' },
      page,
      limit,
    });
    const data = result.data as PostApprovalLabContract[];
    // Apply search filter in-memory if provided
    const filtered = options?.search
      ? data.filter(
          (c) =>
            c.contractNumber
              ?.toLowerCase()
              .includes(options.search!.toLowerCase()) ||
            c.customerName
              ?.toLowerCase()
              .includes(options.search!.toLowerCase()) ||
            (c.projectName ?? '')
              .toLowerCase()
              .includes(options.search!.toLowerCase()),
        )
      : data;
    return {
      data: filtered,
      total: result.meta?.total ?? filtered.length,
      page,
      totalPages:
        result.meta?.totalPages ??
        Math.max(1, Math.ceil((result.meta?.total ?? filtered.length) / limit)),
    };
  }

  private async generateNextSampleCode(): Promise<string> {
    return this.sampleRepo.generateNextSampleCode();
  }

  async delete(id: string): Promise<boolean> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Lab contract not found');
    if (!['draft', 'cancelled'].includes(contract.status)) {
      throw new BadRequestException(
        'Only draft or cancelled contracts can be deleted',
      );
    }
    return this.repository.delete(id);
  }
}
