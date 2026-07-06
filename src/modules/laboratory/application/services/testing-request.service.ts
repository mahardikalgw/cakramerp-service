import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TestingRequest } from '../../domain/entities/testing-request.entity';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LabPurchaseOrder } from '../../domain/entities/lab-purchase-order.entity';
import { LabActivityLogService } from './lab-activity-log.service';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { SalesOrderService } from '../../../sales/application/services/sales-order.service';
import { SalesFinanceAdapter } from '../../../sales/application/adapters/sales-finance.adapter';
import type { CustomerRepositoryPort } from '../../../customer/domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../../customer/domain/repositories/customer-repository.port';
import type { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../domain/repositories/testing-service-repository.port';
import type { SampleQuotaRepositoryPort } from '../../domain/repositories/sample-quota-repository.port';
import { SAMPLE_QUOTA_REPOSITORY } from '../../domain/repositories/sample-quota-repository.port';
import { SampleQuota } from '../../domain/entities/sample-quota.entity';
import { DataSource } from 'typeorm';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import { PostApprovalLabContractService } from './post-approval-lab-contract.service';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { NotificationEventService } from './notification-event.service';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';

@Injectable()
export class TestingRequestService {
  private readonly logger = new Logger(TestingRequestService.name);

  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly repository: TestingRequestRepositoryPort,
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly poRepo: LabPurchaseOrderRepositoryPort,
    private readonly activityLog: LabActivityLogService,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly salesOrderService: SalesOrderService,
    private readonly salesFinanceAdapter: SalesFinanceAdapter,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject(TESTING_SERVICE_REPOSITORY)
    private readonly testingServiceRepo: TestingServiceRepositoryPort,
    @Inject(SAMPLE_QUOTA_REPOSITORY)
    private readonly sampleQuotaRepo: SampleQuotaRepositoryPort,
    private readonly dataSource: DataSource,
    private readonly minioService: MinioClientService,
    private readonly contractService: PostApprovalLabContractService,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    private readonly notificationEventService: NotificationEventService,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly postApprovalContractRepo: PostApprovalLabContractRepositoryPort,
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

  async findById(id: string): Promise<TestingRequest | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    if (existing.quotaGranted) {
      try {
        (existing as any).sampleQuotas =
          await this.sampleQuotaRepo.findByTestingRequestId(id);
      } catch {
        (existing as any).sampleQuotas = [];
      }
    }
    return existing;
  }

  async findByRequestNumber(
    requestNumber: string,
  ): Promise<TestingRequest | null> {
    return this.repository.findByRequestNumber(requestNumber);
  }

  async getLastRequestNumber(): Promise<string | null> {
    return this.repository.getLastRequestNumber();
  }

  private generateRequestNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/REQ-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `REQ-${year}-${seq.toString().padStart(5, '0')}`;
  }

  private generatePONumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/LPO-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `LPO-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async create(dto: {
    customerId: string;
    projectName: string;
    projectLocation?: string;
    sampleQuantity?: number;
    scheduleDate?: string;
    notes?: string;
    billingType?: string;
    // Portal fields
    submittedBy?: 'admin' | 'customer';
    customerUserId?: string;
    projectAddress?: string;
    preferredScheduleDate?: string;
    priority?: 'normal' | 'urgent';
    createdByUserId?: string;
    createdByName?: string;
    lines: {
      testingServiceId?: string;
      serviceName?: string;
      sampleQuantity?: number;
      notes?: string;
    }[];
  }): Promise<TestingRequest> {
    const lastNumber = await this.getLastRequestNumber();
    const requestNumber = this.generateRequestNumber(lastNumber);

    const submittedBy = dto.submittedBy ?? 'admin';
    // Customer-submitted requests are auto-submitted
    const initialStatus = submittedBy === 'customer' ? 'submitted' : 'draft';

    const entity = new TestingRequest({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      requestNumber,
      customerId: dto.customerId,
      projectName: dto.projectName,
      projectLocation: dto.projectLocation,
      sampleQuantity: dto.sampleQuantity,
      scheduleDate: dto.scheduleDate,
      notes: dto.notes,
      status: initialStatus,
      submittedBy,
      customerUserId: dto.customerUserId,
      projectAddress: dto.projectAddress,
      preferredScheduleDate: dto.preferredScheduleDate,
      priority: dto.priority ?? 'normal',
      billingType: dto.billingType ?? 'cash',
      lines: dto.lines.map((line) => ({
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        testingRequestId: undefined,
        testingServiceId: line.testingServiceId ?? null,
        serviceName: line.serviceName ?? null,
        sampleQuantity: line.sampleQuantity,
        notes: line.notes,
      })),
    } as any);

    const saved = await this.repository.save(entity);

    if (dto.createdByUserId) {
      void this.activityLog.log({
        testingRequestId: saved.id,
        action: 'submitted',
        performedBy: dto.createdByUserId,
        performedByName: dto.createdByName,
        performedByRole: submittedBy,
        details: { requestNumber: saved.requestNumber },
      });
    }

    return saved;
  }

  async update(
    id: string,
    dto: {
      customerId?: string;
      projectName?: string;
      projectLocation?: string;
      sampleQuantity?: number;
      scheduleDate?: string;
      notes?: string;
      lines?: {
        testingServiceId?: string;
        serviceName?: string;
        sampleQuantity?: number;
        notes?: string;
      }[];
    },
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async submit(id: string): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Testing request not found');
    }
    if (existing.status !== 'draft') {
      throw new Error('Only draft requests can be submitted');
    }
    existing.status = 'submitted';
    return this.repository.save(existing);
  }

  async approve(
    id: string,
    userId: string,
    userName?: string,
    downPaymentAmount?: number,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (existing.status !== 'submitted') {
      throw new BadRequestException('Only submitted requests can be approved');
    }
    existing.status = 'approved';
    existing.approvedBy = userId;
    existing.approvedAt = new Date();

    if (existing.billingType === 'contract' && existing.labContractId) {
      // Contract billing: deduct quota on approval
      const contract = await this.contractRepo.findById(existing.labContractId);
      if (contract) {
        // Check if contract is expired
        if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
          throw new BadRequestException(
            `Contract has expired since ${contract.expiresAt instanceof Date ? contract.expiresAt.toISOString().split('T')[0] : contract.expiresAt}`,
          );
        }
        if (!(contract as any).isUnlimited) {
          const totalQty = (existing.lines || []).reduce(
            (sum, l) => sum + (l.sampleQuantity ?? 0),
            0,
          );
          const qtyToDeduct = totalQty > 0 ? totalQty : 1;
          contract.usedQuota += qtyToDeduct;
          contract.remainingQuota =
            (contract.totalQuota ?? 0) - contract.usedQuota;
          if (contract.remainingQuota < 0) contract.remainingQuota = 0;
        }
        await this.contractRepo.save(contract);
      }
    } else if (existing.billingType === 'contract' && !existing.labContractId) {
      this.logger.log(
        `[CONTRACT] New contract request ${existing.id}: storing DP amount and creating PostApprovalLabContract...`,
      );
      // Store down payment amount (admin enters this on approval)
      if (downPaymentAmount && downPaymentAmount > 0) {
        existing.downPaymentAmount = downPaymentAmount;
      }
      try {
        // Create the PostApprovalLabContract entity immediately on approval.
        // totalAmount is set to downPaymentAmount (DP value).
        const contract = await this.contractService.generateForContractRequest(
          existing.id,
          userId,
          userName,
          downPaymentAmount,
        );
        existing.labContractId = contract.id;
        this.logger.log(
          `[CONTRACT] PostApprovalLabContract created on approval: ${contract.id} (${contract.contractNumber})`,
        );
        // Reload to get invoiceDocumentUrl and contractDocumentUrl set by the service
        const reloaded = await this.repository.findById(id);
        if (reloaded) {
          existing.invoiceDocumentUrl = reloaded.invoiceDocumentUrl;
          existing.contractDocumentUrl = reloaded.contractDocumentUrl;
        }
      } catch (err: any) {
        this.logger.error(
          `[CONTRACT] Contract creation failed for request ${existing.id}: ${err?.message}`,
          err?.stack,
        );
        void this.activityLog.log({
          testingRequestId: id,
          action: 'document_generation_failed',
          performedBy: userId,
          performedByName: userName,
          performedByRole: 'admin',
          details: { error: err?.message },
        });
      }
    } else if (existing.billingType === 'cash') {
      // Cash billing: ensure Lab PO exists, then generate documents
      if (!existing.labPurchaseOrderId) {
        this.logger.log(
          `[DOC] Creating Lab PO on-the-fly for admin-created request ${existing.id}...`,
        );
        const lastPONumber = await this.poRepo.getLastPONumber();
        const poNumber = this.generatePONumber(lastPONumber);
        const customer = await this.customerRepo
          .findById(existing.customerId)
          .catch(() => null);
        const customerName =
          customer?.name || existing.customerName || existing.customerId;

        let totalAmount = 0;
        const poLines = (existing.lines || []).map((line) => {
          const total = (line.sampleQuantity ?? 0) * 0;
          totalAmount += total;
          return {
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            labPurchaseOrderId: undefined,
            testingServiceId: line.testingServiceId ?? '',
            serviceName: line.serviceName ?? 'Testing Service',
            quantity: line.sampleQuantity ?? 1,
            unitPrice: 0,
            total: 0,
          };
        });

        const po = new LabPurchaseOrder({
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          poNumber,
          customerId: existing.customerId,
          customerName,
          testingServiceId: existing.lines?.[0]?.testingServiceId ?? '',
          sampleQuantity: (existing.lines || []).reduce(
            (sum, l) => sum + (l.sampleQuantity ?? 0),
            0,
          ),
          totalAmount,
          status: 'draft',
          lines: poLines as any,
        } as any);
        const savedPO = await this.poRepo.save(po);
        existing.labPurchaseOrderId = savedPO.id;
        this.logger.log(
          `[DOC] Created Lab PO ${savedPO.id} (${poNumber}) for request ${existing.id}`,
        );
      }

      this.logger.log(
        `[DOC] Cash branch entered for request ${existing.id}, labPurchaseOrderId=${existing.labPurchaseOrderId}`,
      );
      try {
        const po = await this.poRepo.findById(existing.labPurchaseOrderId);
        const customer = po
          ? await this.customerRepo.findById(po.customerId).catch(() => null)
          : null;

        this.logger.log(
          `[DOC] Loaded PO ${po?.id} with ${po?.lines?.length ?? 0} lines, customer=${customer?.name ?? 'NOT FOUND'}`,
        );

        if (!po) {
          this.logger.warn(
            `[DOC] Skipping: Lab PO ${existing.labPurchaseOrderId} not found`,
          );
        } else if (!po.lines || po.lines.length === 0) {
          this.logger.warn(`[DOC] Skipping: Lab PO ${po.id} has no lines`);
        } else {
          // Compute total samples for the PO header
          const totalSamples = po.lines.reduce(
            (sum, l) => sum + (l.quantity ?? 0),
            0,
          );

          this.logger.log(
            `[DOC] Generating Lab PO document for ${po.poNumber}...`,
          );
          // 1. Generate Lab PO document (NO prices - just sample list)
          const poDoc = await this.docHelper.generateDocument({
            documentType: DOCUMENT_TYPES.LAB_PURCHASE_ORDER,
            entityId: po.id,
            requestedBy: userId,
            outputFormat: 'pdf',
            parameters: {
              poNumber: po.poNumber || '',
              customerName: customer?.name || po.customerName || '',
              customerAddress: customer?.address || '',
              status: po.status || 'draft',
              orderDate: po.createdAt
                ? po.createdAt.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              requestNumber: existing.requestNumber || '',
              totalSamples: String(totalSamples),
              authorizedByName: userName || 'Lab Authorized',
            },
            lines: po.lines.map((l, idx) => {
              const trLine = existing.lines?.[idx];
              return {
                serviceName: l.serviceName || 'Testing Service',
                sampleCode: trLine?.sampleCode || `SAMPLE-${idx + 1}`,
                quantity: String(l.quantity ?? 1),
              };
            }),
          });
          existing.poDocumentUrl = poDoc.id;
          this.logger.log(`[DOC] Lab PO document saved: ${poDoc.id}`);

          // Store GeneratedDocument.id on the Lab Purchase Order
          try {
            po.documentUrl = poDoc.id;
            await this.poRepo.save(po);
          } catch {
            // best-effort
          }

          this.logger.log(`[DOC] Generating Invoice document...`);
          // 2. Generate Invoice document (with prices, Rp prefix added in template)
          const invDoc = await this.docHelper.generateDocument({
            documentType: DOCUMENT_TYPES.LAB_INVOICE,
            entityId: po.id,
            requestedBy: userId,
            outputFormat: 'pdf',
            parameters: {
              invoiceNumber: `INV-${po.poNumber || existing.requestNumber}`,
              customerName: customer?.name || po.customerName || '',
              customerAddress: customer?.address || '',
              invoiceDate: new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 30 * 86400000)
                .toISOString()
                .split('T')[0],
              totalAmount:
                po.totalAmount != null ? String(po.totalAmount) : '0',
              status: 'issued',
              authorizedByName: userName || 'Lab Authorized',
            },
            lines: po.lines.map((l) => ({
              description: l.serviceName || 'Testing Service',
              quantity: String(l.quantity ?? 1),
              unitPrice: l.unitPrice != null ? String(l.unitPrice) : '0',
              total: l.total != null ? String(l.total) : '0',
            })),
          });
          existing.invoiceDocumentUrl = invDoc.id;
          this.logger.log(`[DOC] Invoice document saved: ${invDoc.id}`);
        }
      } catch (docErr: any) {
        this.logger.error(
          `[DOC] Document generation failed for request ${existing.id}: ${docErr?.message}`,
          docErr?.stack,
        );
        void this.activityLog.log({
          testingRequestId: id,
          action: 'document_generation_failed',
          performedBy: userId,
          performedByName: userName,
          performedByRole: 'admin',
          details: { error: docErr?.message },
        });
      }
    } else {
      this.logger.warn(
        `[DOC] Skipping document generation: billingType=${existing.billingType}, labPurchaseOrderId=${existing.labPurchaseOrderId}`,
      );
    }

    // Create draft Sales Order from testing request lines OR from down payment for contract billing
    try {
      this.logger.log(
        `[SO] Step 1: Checking lines for request ${existing.id}...`,
      );
      // Ensure lines are loaded (defensive against lazy-load issues)
      if (!existing.lines || existing.lines.length === 0) {
        const refetch = await this.repository.findById(id);
        if (refetch && refetch.lines && refetch.lines.length > 0) {
          existing.lines = refetch.lines;
        }
      }

      const dpAmount = existing.downPaymentAmount ?? downPaymentAmount ?? 0;

      // For contract billing with no lines, create a SO from the down payment amount
      if (
        (!existing.lines || existing.lines.length === 0) &&
        existing.billingType === 'contract' &&
        dpAmount > 0
      ) {
        this.logger.log(
          `[SO] Contract request with no lines — creating SO from down payment amount: ${dpAmount}`,
        );
        const customer = await this.customerRepo
          .findById(existing.customerId)
          .catch(() => null);
        const customerName =
          customer?.name || existing.customerName || existing.customerId;
        const so = await this.salesOrderService.create({
          customerId: existing.customerId,
          customerName,
          orderDate: new Date().toISOString().split('T')[0],
          notes: `Down Payment — Contract Testing Request ${existing.requestNumber}`,
          lines: [
            {
              itemName: `Down Payment — Contract Testing (${existing.projectName || '-'})`,
              quantity: 1,
              unitPrice: dpAmount,
              uom: 'package',
              lineType: 'service',
            },
          ],
        });
        existing.salesOrderId = so.id;
        this.logger.log(
          `[SO] Created contract DP SO ${so.id} for request ${existing.id}`,
        );
        try {
          await this.salesOrderService.approve(so.id);
        } catch {
          /* ignore */
        }
        try {
          await this.salesFinanceAdapter.recordSOApprovalGl(so.id);
        } catch {
          /* ignore */
        }
        try {
          await this.salesFinanceAdapter.createDraftARInvoiceFromSO(
            so.id,
            userId,
          );
        } catch {
          /* ignore */
        }
      } else if (!existing.lines || existing.lines.length === 0) {
        this.logger.warn(
          `[SO] Skipping: testing request ${existing.id} has no lines`,
        );
      } else {
        this.logger.log(
          `[SO] Step 2: Looking up customer ${existing.customerId}...`,
        );
        // Look up customer for proper name
        const customer = await this.customerRepo
          .findById(existing.customerId)
          .catch(() => null);
        const customerName =
          customer?.name || existing.customerName || existing.customerId;
        this.logger.log(`[SO] Step 2 result: customerName=${customerName}`);

        this.logger.log(
          `[SO] Step 3: Building ${existing.lines.length} SO lines...`,
        );
        // Look up service prices for SO line unitPrice
        const soLines = await Promise.all(
          existing.lines.map(async (line) => {
            const service = line.testingServiceId
              ? await this.testingServiceRepo
                  .findById(line.testingServiceId)
                  .catch(() => null)
              : null;
            const rawPrice = Number(service?.unitPrice ?? 0);
            const unitPrice = Number.isFinite(rawPrice) ? rawPrice : 0;
            return {
              itemName: line.serviceName || service?.name || 'Testing Service',
              quantity: line.sampleQuantity || 1,
              unitPrice,
              description: line.sampleCode || undefined,
              uom: 'sample',
              lineType: 'service',
            };
          }),
        );
        this.logger.log(
          `[SO] Step 3 result: ${soLines.length} lines, firstLineUnitPrice=${soLines[0]?.unitPrice}`,
        );

        this.logger.log(`[SO] Step 4: Calling salesOrderService.create()...`);
        const so = await this.salesOrderService.create({
          customerId: existing.customerId,
          customerName,
          orderDate: new Date().toISOString().split('T')[0],
          notes: `Auto-generated from testing request ${existing.requestNumber}`,
          lines: soLines,
        });
        existing.salesOrderId = so.id;
        this.logger.log(
          `[SO] Step 4 SUCCESS: Created draft SO ${so.id} (SO# ${so.soNumber}) for request ${existing.id}`,
        );

        // Service-only SOs: auto-approve → GL post → invoice (skip delivery)
        const allServiceLines = soLines.every(
          (l) => (l as any).lineType === 'service',
        );
        if (allServiceLines) {
          this.logger.log(`[SO] Step 5: Service-only SO — auto-approving...`);
          await this.salesOrderService.approve(so.id);

          this.logger.log(`[SO] Step 6: Recording GL posting...`);
          try {
            await this.salesFinanceAdapter.recordSOApprovalGl(so.id);
          } catch (glErr: any) {
            this.logger.warn(
              `[SO] Step 6 GL posting failed (non-blocking): ${glErr?.message}`,
            );
          }

          this.logger.log(`[SO] Step 7: Auto-invoicing service SO...`);
          try {
            const invoice =
              await this.salesFinanceAdapter.createDraftARInvoiceFromSO(
                so.id,
                userId,
              );
            this.logger.log(
              `[SO] Step 7 SUCCESS: Created AR Invoice ${invoice.invoiceNumber} for SO ${so.id}`,
            );
          } catch (invErr: any) {
            this.logger.warn(
              `[SO] Step 7 auto-invoice failed (non-blocking): ${invErr?.message}`,
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.error(
        `[SO] FAILED for request ${existing.id}: ${err?.message}`,
        err?.stack,
      );
      // Store error in notes so admin can see it in the detail page
      const errorMsg = `SO Creation Error: ${err?.message}`;
      existing.notes = existing.notes
        ? `${existing.notes}\n${errorMsg}`
        : errorMsg;
      // Persist failure in activity log
      void this.activityLog.log({
        testingRequestId: id,
        action: 'so_creation_failed',
        performedBy: userId,
        performedByName: userName,
        performedByRole: 'admin',
        details: { error: err?.message },
      });
    }

    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'approved',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'admin',
    });

    const customerUserId =
      existing.customerUserId || (existing as any).customerUserId;
    if (customerUserId) {
      void this.notificationEventService
        .onTestingRequestApproved(existing, customerUserId)
        .catch(() => {});
    }

    return saved;
  }

  async reject(
    id: string,
    userId: string,
    rejectionReason?: string,
    userName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    existing.status = 'rejected';
    existing.rejectionReason = rejectionReason;
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'rejected',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'admin',
      details: { reason: rejectionReason },
    });
    return saved;
  }

  async assignLaboran(
    id: string,
    laboranId: string,
    laboranName: string,
    assignedById: string,
    assignedByName?: string,
    notes?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (existing.status !== 'approved') {
      throw new BadRequestException(
        'Only approved requests can be assigned to a laboran',
      );
    }
    existing.status = 'assigned';
    existing.assignedLaboranId = laboranId;
    existing.assignedLaboranName = laboranName;
    existing.assignedAt = new Date();
    existing.assignmentNotes = notes;
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'assigned',
      performedBy: assignedById,
      performedByName: assignedByName,
      performedByRole: 'admin',
      details: { laboranId, laboranName, notes },
    });
    return saved;
  }

  async findByLaboranId(
    laboranId: string,
    options?: { page?: number; limit?: number },
  ) {
    return this.repository.findAll({
      filters: { assignedLaboranId: laboranId },
      page: options?.page,
      limit: options?.limit,
    });
  }

  async getTimeline(id: string) {
    return this.activityLog.getTimeline(id);
  }

  async uploadSignedDocumentFile(
    id: string,
    file: any,
    uploadedByUserId: string,
    uploadedByName?: string,
  ): Promise<TestingRequest> {
    if (!file) throw new BadRequestException('File is required');
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!['approved'].includes(existing.status)) {
      throw new BadRequestException(
        'Signed document can only be uploaded for approved requests',
      );
    }
    const objectName = `signed-documents/${id}/${Date.now()}_${file.originalname}`;
    const minioPath = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    existing.signedDocumentUrl = minioPath;
    existing.signedDocumentFilename = file.originalname;
    existing.signedDocumentUploadedAt = new Date();
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'signed_document_uploaded',
      performedBy: uploadedByUserId,
      performedByName: uploadedByName,
      performedByRole: 'admin',
      details: { fileName: file.originalname },
    });
    return saved;
  }

  async uploadPaymentProofFile(
    id: string,
    file: any,
    uploadedByUserId: string,
    uploadedByName?: string,
  ): Promise<TestingRequest> {
    if (!file) throw new BadRequestException('File is required');
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!['approved'].includes(existing.status)) {
      throw new BadRequestException(
        'Payment proof can only be uploaded for approved requests',
      );
    }
    const objectName = `payment-proofs/${id}/${Date.now()}_${file.originalname}`;
    const minioPath = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    existing.paymentProofUrl = minioPath;
    existing.paymentProofFilename = file.originalname;
    existing.paymentProofUploadedAt = new Date();
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'payment_proof_uploaded',
      performedBy: uploadedByUserId,
      performedByName: uploadedByName,
      performedByRole: 'admin',
      details: { fileName: file.originalname },
    });
    return saved;
  }

  async getSignedDownloadUrl(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');

    const urlField = existing.signedContractUrl || existing.signedDocumentUrl;
    const filenameField = existing.signedDocumentFilename || '';

    if (!urlField) {
      throw new NotFoundException('No signed document uploaded');
    }
    if (urlField.startsWith('http')) {
      return {
        url: urlField,
        filename: filenameField || 'signed-document.pdf',
      };
    }
    // uploadFile() stores path as "bucket/objectName", strip bucket prefix
    const objectName = urlField.replace(/^[^/]+\//, '');
    const url = this.minioService.getPublicDownloadUrl('documents', objectName);
    // Extract filename from Minio path if not stored separately
    const filename =
      filenameField ||
      (() => {
        const parts = objectName.split('_');
        return parts.length > 1
          ? parts.slice(1).join('_')
          : 'signed-document.pdf';
      })();
    return { url, filename };
  }

  async getPaymentProofDownloadUrl(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!existing.paymentProofUrl) {
      throw new NotFoundException('No payment proof uploaded');
    }
    if (existing.paymentProofUrl.startsWith('http')) {
      return {
        url: existing.paymentProofUrl,
        filename: existing.paymentProofFilename,
      };
    }
    // uploadFile() stores path as "bucket/objectName", strip bucket prefix
    const objectName = existing.paymentProofUrl.replace(/^[^/]+\//, '');
    const url = this.minioService.getPublicDownloadUrl('documents', objectName);
    return { url, filename: existing.paymentProofFilename };
  }

  async deletePaymentProof(
    id: string,
    deletedByUserId: string,
    deletedByName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!existing.paymentProofUrl) {
      throw new NotFoundException('No payment proof to delete');
    }
    // Only delete from MinIO if it is a stored path (not an external URL)
    if (!existing.paymentProofUrl.startsWith('http')) {
      const objectName = existing.paymentProofUrl.replace(/^[^/]+\//, '');
      await this.minioService.deleteFile('documents', objectName);
    }
    existing.paymentProofUrl = null as any;
    existing.paymentProofFilename = null as any;
    existing.paymentProofUploadedAt = null as any;
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'payment_proof_deleted',
      performedBy: deletedByUserId,
      performedByName: deletedByName,
      performedByRole: 'admin',
      details: {},
    });
    return saved;
  }

  async deleteSignedDocument(
    id: string,
    deletedByUserId: string,
    deletedByName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    const urlField = existing.signedContractUrl || existing.signedDocumentUrl;
    if (!urlField) {
      throw new NotFoundException('No signed document to delete');
    }
    if (!urlField.startsWith('http')) {
      const objectName = urlField.replace(/^[^/]+\//, '');
      await this.minioService.deleteFile('documents', objectName);
    }
    existing.signedDocumentUrl = null as any;
    existing.signedContractUrl = null as any;
    existing.signedDocumentFilename = null as any;
    existing.signedDocumentUploadedAt = null as any;
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'signed_document_deleted',
      performedBy: deletedByUserId,
      performedByName: deletedByName,
      performedByRole: 'admin',
      details: {},
    });
    return saved;
  }

  async verifyDocumentsAndGrantQuota(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (existing.billingType !== 'cash') {
      throw new BadRequestException(
        'Document verification is only for cash billing requests',
      );
    }
    if (!existing.signedDocumentUrl) {
      throw new BadRequestException(
        'Signed document has not been uploaded yet',
      );
    }
    if (!existing.paymentProofUrl) {
      throw new BadRequestException('Payment proof has not been uploaded yet');
    }
    if (existing.quotaGranted) {
      throw new BadRequestException('Quota has already been granted');
    }

    existing.documentVerifiedAt = new Date();
    existing.documentVerifiedBy = adminUserId;
    existing.quotaGranted = true;
    existing.quotaGrantedAt = new Date();
    existing.quotaGrantedBy = adminUserId;

    // Load the linked PO lines for quota creation (do NOT auto-advance PO status)
    let poLines: Array<{
      testingServiceId: string;
      serviceName: string;
      quantity: number;
    }> = [];
    if (existing.labPurchaseOrderId) {
      const po = await this.poRepo.findById(existing.labPurchaseOrderId);
      if (po && po.lines && po.lines.length > 0) {
        poLines = po.lines.map((l) => ({
          testingServiceId: l.testingServiceId,
          serviceName: l.serviceName,
          quantity: l.quantity ?? 0,
        }));
      }
    }

    // Mark linked AR invoice as paid
    if (existing.salesOrderId) {
      try {
        const arInvoice = await this.dataSource.query(
          `SELECT id, status, amount FROM ar_invoices WHERE sales_order_id = $1 LIMIT 1`,
          [existing.salesOrderId],
        );
        if (
          arInvoice.length > 0 &&
          ['draft', 'sent', 'overdue'].includes(arInvoice[0].status)
        ) {
          await this.dataSource.query(
            `UPDATE ar_invoices SET status = 'paid', paid_amount = amount, updated_at = NOW() WHERE id = $1`,
            [arInvoice[0].id],
          );
          this.logger.log(
            `[VERIFY] AR Invoice ${arInvoice[0].id} marked as paid`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `[VERIFY] Failed to update AR invoice status: ${err?.message}`,
        );
      }
    }

    // Update Sales Order and create GL posting for payment received
    if (existing.salesOrderId) {
      await this.recordPaymentToSOAndGL(
        existing.salesOrderId,
        existing.requestNumber,
        existing.customerId,
        existing.customerName,
        0,
      );
    }

    // Create sample_quotas — one row per PO line
    if (poLines.length > 0) {
      const quotas = poLines.map(
        (line) =>
          new SampleQuota({
            testingRequestId: existing.id,
            testingServiceId: line.testingServiceId,
            testingServiceName: line.serviceName,
            customerId: existing.customerId,
            totalQuota: line.quantity,
            usedQuota: 0,
            remainingQuota: line.quantity,
            grantedAt: new Date(),
            grantedBy: adminUserId,
          }),
      );

      if (quotas.length > 0) {
        await this.sampleQuotaRepo.saveMany(quotas);
        this.logger.log(
          `[VERIFY] Created ${quotas.length} per-line sample quota rows for request ${existing.id}`,
        );
      }
    }

    const saved = await this.repository.save(existing);

    try {
      await this.contractService.generateFromTestingRequest(
        id,
        adminUserId,
        adminUserName,
      );
      this.logger.log(`[VERIFY] Lab contract generated for request ${id}`);
    } catch (err: any) {
      this.logger.warn(
        `[VERIFY] Lab contract generation failed: ${err?.message}`,
      );
    }

    void this.activityLog.log({
      testingRequestId: id,
      action: 'documents_verified_quota_granted',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: { quotaCount: poLines.length },
    });
    return saved;
  }

  private async recordPaymentToSOAndGL(
    soId: string,
    requestNumber: string,
    customerId: string,
    customerName: string | undefined,
    amount: number,
  ): Promise<void> {
    try {
      const soRows: any[] = await this.dataSource.query(
        `SELECT id, so_number, status, grand_total FROM sales_orders WHERE id = $1 LIMIT 1`,
        [soId],
      );
      if (soRows.length === 0) return;

      const so = soRows[0];
      const payAmount = amount > 0 ? amount : Number(so.grand_total);

      await this.dataSource.query(
        `UPDATE sales_orders SET status = 'invoiced', updated_at = NOW() WHERE id = $1 AND status NOT IN ('closed', 'cancelled')`,
        [soId],
      );

      await this.dataSource.query(
        `INSERT INTO gl_posting_queue (source_type, source_id, source_number, event_type, amount, description, status, suggested_lines, customer_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', '[]', $7, NOW(), NOW())`,
        [
          'sales_order',
          soId,
          so.so_number,
          'payment_received',
          payAmount,
          `Payment received — ${requestNumber} (${customerName || customerId})`,
          customerId,
        ],
      );
    } catch (err: any) {
      this.logger.warn(
        `[PAYMENT] Failed to update SO/GL for SO ${soId}: ${err?.message}`,
      );
    }
  }

  async confirmDpPayment(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (existing.billingType !== 'contract') {
      throw new BadRequestException(
        'Only contract billing requests can have DP confirmed',
      );
    }
    if (existing.status !== 'approved') {
      throw new BadRequestException('Request must be in approved status');
    }
    if (!existing.paymentProofUrl) {
      throw new BadRequestException(
        'Customer has not uploaded down payment proof yet',
      );
    }

    // Create PostApprovalLabContract if not already created at approval time
    if (!existing.labContractId) {
      try {
        const contract = await this.contractService.generateForContractRequest(
          id,
          adminUserId,
          adminUserName,
          Number(existing.downPaymentAmount ?? 0),
        );
        existing.labContractId = contract.id;
        this.logger.log(
          `[DP CONFIRM] Contract created as fallback: ${contract.id} (${contract.contractNumber})`,
        );
      } catch (err: any) {
        this.logger.error(
          `[DP CONFIRM] Fallback contract creation failed: ${err?.message}`,
          err?.stack,
        );
        throw new BadRequestException(
          'Failed to create contract. Please try approving the request again.',
        );
      }
    }

    existing.status = 'approved';
    existing.contractConfirmedAt = new Date();
    existing.contractConfirmedBy = adminUserId;

    const saved = await this.repository.save(existing);

    // Update the PostApprovalLabContract status to active
    if (existing.labContractId) {
      try {
        await this.contractService.updateStatus(
          existing.labContractId,
          'active',
        );
        this.logger.log(
          `[DP CONFIRM] Contract status updated to active: ${existing.labContractId}`,
        );
      } catch (err: any) {
        this.logger.warn(
          `[DP CONFIRM] Failed to update contract status: ${err?.message}`,
        );
      }
    }

    // Update Sales Order and create GL posting for payment received
    if (existing.salesOrderId) {
      await this.recordPaymentToSOAndGL(
        existing.salesOrderId,
        existing.requestNumber,
        existing.customerId,
        existing.customerName,
        existing.downPaymentAmount ?? 0,
      );
    }

    void this.activityLog
      .log({
        testingRequestId: id,
        action: 'dp_payment_confirmed',
        performedBy: adminUserId,
        performedByName: adminUserName,
        performedByRole: 'admin',
        details: { contractId: existing.labContractId },
      })
      .catch(() => {});

    return saved;
  }

  async confirmSignedContract(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (existing.billingType !== 'contract') {
      throw new BadRequestException(
        'Only contract billing requests can have signed contracts confirmed',
      );
    }
    if (existing.status !== 'approved') {
      throw new BadRequestException(
        'Only approved requests can have signed contracts confirmed',
      );
    }
    if (!existing.signedContractUrl) {
      throw new BadRequestException(
        'Customer has not uploaded a signed contract yet',
      );
    }

    existing.status = 'approved';
    existing.contractConfirmedAt = new Date();
    existing.contractConfirmedBy = adminUserId;
    existing.quotaGranted = true;
    existing.quotaGrantedAt = new Date();
    existing.quotaGrantedBy = adminUserId;

    if (existing.labContractId) {
      try {
        const contract = await this.contractService.findById(
          existing.labContractId,
        );
        if (contract) {
          contract.status = 'active' as any;
          contract.signedContractUrl = existing.signedContractUrl;
          contract.contractConfirmedAt = new Date();
          contract.contractConfirmedBy = adminUserId;
          contract.billingStartDate = new Date();
          contract.status = 'active' as any;
          await this.postApprovalContractRepo.save(contract);
        }
      } catch (err: any) {
        this.logger.error(
          `[CONTRACT] Failed to update contract status: ${err?.message}`,
        );
      }
    }

    const saved = await this.repository.save(existing);

    void this.activityLog.log({
      testingRequestId: id,
      action: 'signed_contract_confirmed',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: { contractId: existing.labContractId },
    });

    if (existing.customerUserId) {
      void this.notificationEventService
        .onContractConfirmed(existing, existing.customerUserId)
        .catch(() => {});
    }

    return saved;
  }

  async getPoDownloadUrl(
    testingRequestId: string,
  ): Promise<{ url: string; filename: string; expiresAt: string }> {
    const request = await this.repository.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (!request.labPurchaseOrderId)
      throw new NotFoundException('No Lab PO linked to this request');
    const po = await this.poRepo.findById(request.labPurchaseOrderId);
    if (!po || !po.documentUrl)
      throw new NotFoundException('PO document not yet generated');
    const url = await this.docHelper.getDownloadUrl(po.documentUrl);
    return {
      url,
      filename: `${po.poNumber || 'PO'}.pdf`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  async getInvoiceDownloadUrl(
    testingRequestId: string,
  ): Promise<{ url: string; filename: string; expiresAt: string }> {
    const request = await this.repository.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (!request.invoiceDocumentUrl)
      throw new NotFoundException('Invoice document not yet generated');
    const url = await this.docHelper.getDownloadUrl(request.invoiceDocumentUrl);
    return {
      url,
      filename: `INV-${request.requestNumber || 'Invoice'}.pdf`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  async getContractDocumentDownloadUrl(
    testingRequestId: string,
  ): Promise<{ url: string; filename: string }> {
    const request = await this.repository.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    // Check contract document stored on the testing request (new flow)
    if (request.contractDocumentUrl) {
      const url = await this.docHelper.getDownloadUrl(
        request.contractDocumentUrl,
      );
      if (url)
        return {
          url,
          filename: `contract-${request.requestNumber || testingRequestId.substring(0, 8)}.pdf`,
        };
    }
    // Fallback: contract entity
    if (request.labContractId) {
      return this.contractService.getContractDownloadUrl(request.labContractId);
    }
    throw new NotFoundException('Contract document not yet generated');
  }

  async getTaxInvoiceDownloadUrl(
    testingRequestId: string,
  ): Promise<{ url: string; filename: string }> {
    const request = await this.repository.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    // Check invoice document stored on the testing request (DP invoice from approval flow)
    if (request.invoiceDocumentUrl) {
      const url = await this.docHelper.getDownloadUrl(
        request.invoiceDocumentUrl,
      );
      if (url)
        return {
          url,
          filename: `dp-invoice-${request.requestNumber || testingRequestId.substring(0, 8)}.pdf`,
        };
    }
    // Fallback: contract entity tax invoice
    if (request.labContractId) {
      return this.contractService.getTaxInvoiceDownloadUrl(
        request.labContractId,
      );
    }
    throw new NotFoundException('Tax invoice not yet generated');
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
