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
import { LabActivityLogService } from './lab-activity-log.service';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { SalesOrderService } from '../../../sales/application/services/sales-order.service';
import { SalesFinanceAdapter } from '../../../sales/application/adapters/sales-finance.adapter';
import type { CustomerRepositoryPort } from '../../../customer/domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../../customer/domain/repositories/customer-repository.port';
import type { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../domain/repositories/testing-service-repository.port';

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
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<TestingRequest | null> {
    return this.repository.findById(id);
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

  async create(dto: {
    customerId: string;
    projectName: string;
    projectLocation?: string;
    testingType?: string;
    sampleQuantity?: number;
    scheduleDate?: string;
    notes?: string;
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
      testingType: dto.testingType,
      sampleQuantity: dto.sampleQuantity,
      scheduleDate: dto.scheduleDate,
      notes: dto.notes,
      status: initialStatus,
      submittedBy,
      customerUserId: dto.customerUserId,
      projectAddress: dto.projectAddress,
      preferredScheduleDate: dto.preferredScheduleDate,
      priority: dto.priority ?? 'normal',
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
      testingType?: string;
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
        const qtyToDeduct = existing.sampleQuantity ?? 1;
        contract.usedQuota += qtyToDeduct;
        contract.remainingQuota =
          (contract.totalQuota ?? 0) - contract.usedQuota;
        if (contract.remainingQuota < 0) contract.remainingQuota = 0;
        await this.contractRepo.save(contract);
      }
    } else if (existing.billingType === 'cash' && existing.labPurchaseOrderId) {
      // Cash billing: generate PO + invoice documents synchronously via REST
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
          this.logger.warn(`[DOC] Skipping: Lab PO ${existing.labPurchaseOrderId} not found`);
        } else if (!po.lines || po.lines.length === 0) {
          this.logger.warn(`[DOC] Skipping: Lab PO ${po.id} has no lines`);
        } else {
          this.logger.log(`[DOC] Generating Lab PO document for ${po.poNumber}...`);
          // 1. Generate Lab PO document
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
              totalAmount: Number(po.totalAmount).toFixed(2),
            },
            lines: po.lines.map((l) => ({
              serviceName: l.serviceName || 'Testing Service',
              quantity: String(l.quantity ?? 1),
              unitPrice: Number(l.unitPrice ?? 0).toFixed(2),
              total: Number(l.total ?? 0).toFixed(2),
            })),
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
          // 2. Generate Invoice document (from same Lab PO data)
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
              dueDate: new Date(
                Date.now() + 30 * 86400000,
              )
                .toISOString()
                .split('T')[0],
              totalAmount: Number(po.totalAmount).toFixed(2),
              status: 'issued',
            },
            lines: po.lines.map((l) => ({
              description: l.serviceName || 'Testing Service',
              quantity: String(l.quantity ?? 1),
              unitPrice: Number(l.unitPrice ?? 0).toFixed(2),
              total: Number(l.total ?? 0).toFixed(2),
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

    // Create draft Sales Order from testing request lines (all billing types)
    try {
      this.logger.log(`[SO] Step 1: Checking lines for request ${existing.id}...`);
      // Ensure lines are loaded (defensive against lazy-load issues)
      if (!existing.lines || existing.lines.length === 0) {
        const refetch = await this.repository.findById(id);
        if (refetch && refetch.lines && refetch.lines.length > 0) {
          existing.lines = refetch.lines;
        }
      }

      if (!existing.lines || existing.lines.length === 0) {
        this.logger.warn(
          `[SO] Skipping: testing request ${existing.id} has no lines`,
        );
      } else {
        this.logger.log(`[SO] Step 2: Looking up customer ${existing.customerId}...`);
        // Look up customer for proper name
        const customer = await this.customerRepo
          .findById(existing.customerId)
          .catch(() => null);
        const customerName =
          customer?.name ||
          existing.customerName ||
          existing.customerId;
        this.logger.log(`[SO] Step 2 result: customerName=${customerName}`);

        this.logger.log(`[SO] Step 3: Building ${existing.lines.length} SO lines...`);
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
              itemName:
                line.serviceName || service?.name || 'Testing Service',
              quantity: line.sampleQuantity || 1,
              unitPrice,
              description: line.sampleCode || undefined,
              uom: 'sample',
              lineType: 'service',
            };
          }),
        );
        this.logger.log(`[SO] Step 3 result: ${soLines.length} lines, firstLineUnitPrice=${soLines[0]?.unitPrice}`);

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
            this.logger.warn(`[SO] Step 6 GL posting failed (non-blocking): ${glErr?.message}`);
          }

          this.logger.log(`[SO] Step 7: Auto-invoicing service SO...`);
          try {
            const invoice = await this.salesFinanceAdapter.createDraftARInvoiceFromSO(
              so.id,
              userId,
            );
            this.logger.log(
              `[SO] Step 7 SUCCESS: Created AR Invoice ${invoice.invoiceNumber} for SO ${so.id}`,
            );
          } catch (invErr: any) {
            this.logger.warn(`[SO] Step 7 auto-invoice failed (non-blocking): ${invErr?.message}`);
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

  async uploadSignedDocument(
    id: string,
    fileUrl: string,
    fileName: string,
    uploadedByUserId: string,
    uploadedByName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!['approved'].includes(existing.status)) {
      throw new BadRequestException(
        'Signed document can only be uploaded for approved requests',
      );
    }
    existing.signedDocumentUrl = fileUrl;
    existing.signedDocumentFilename = fileName;
    existing.signedDocumentUploadedAt = new Date();
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'signed_document_uploaded',
      performedBy: uploadedByUserId,
      performedByName: uploadedByName,
      performedByRole: 'customer',
      details: { fileName },
    });
    return saved;
  }

  async uploadPaymentProof(
    id: string,
    fileUrl: string,
    fileName: string,
    uploadedByUserId: string,
    uploadedByName?: string,
  ): Promise<TestingRequest> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Testing request not found');
    if (!['approved'].includes(existing.status)) {
      throw new BadRequestException(
        'Payment proof can only be uploaded for approved requests',
      );
    }
    existing.paymentProofUrl = fileUrl;
    existing.paymentProofFilename = fileName;
    existing.paymentProofUploadedAt = new Date();
    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'payment_proof_uploaded',
      performedBy: uploadedByUserId,
      performedByName: uploadedByName,
      performedByRole: 'customer',
      details: { fileName },
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

    // Mark the linked PO as paid/active
    if (existing.labPurchaseOrderId) {
      const po = await this.poRepo.findById(existing.labPurchaseOrderId);
      if (po && ['draft', 'signed'].includes(po.status)) {
        po.status = 'paid';
        await this.poRepo.save(po);
      }
    }

    const saved = await this.repository.save(existing);
    void this.activityLog.log({
      testingRequestId: id,
      action: 'documents_verified_quota_granted',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
    });
    return saved;
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
