import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../../user/domain/entities/user.entity';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import type { UserRoleAssignerPort } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import type { CustomerRepositoryPort } from '../../domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer-repository.port';
import type { TestingRequestRepositoryPort } from '../../../laboratory/domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../../laboratory/domain/repositories/testing-request-repository.port';
import type { SampleQuotaRepositoryPort } from '../../../laboratory/domain/repositories/sample-quota-repository.port';
import { SAMPLE_QUOTA_REPOSITORY } from '../../../laboratory/domain/repositories/sample-quota-repository.port';
import type { LabContractRepositoryPort } from '../../../laboratory/domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../../laboratory/domain/repositories/lab-contract-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../../laboratory/domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../../laboratory/domain/repositories/lab-purchase-order-repository.port';
import type { TestingServiceRepositoryPort } from '../../../laboratory/domain/repositories/testing-service-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../../laboratory/domain/repositories/testing-service-repository.port';
import type { LabActivityLogRepositoryPort } from '../../../laboratory/domain/repositories/lab-activity-log-repository.port';
import { LAB_ACTIVITY_LOG_REPOSITORY } from '../../../laboratory/domain/repositories/lab-activity-log-repository.port';
import type { TestResultRepositoryPort } from '../../../laboratory/domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../../laboratory/domain/repositories/test-result-repository.port';
import type { DailyReportRepositoryPort } from '../../../laboratory/domain/repositories/daily-report-repository.port';
import { DAILY_REPORT_REPOSITORY } from '../../../laboratory/domain/repositories/daily-report-repository.port';
import {
  TestingRequest,
  TestingRequestLine,
} from '../../../laboratory/domain/entities/testing-request.entity';
import { LabPurchaseOrder } from '../../../laboratory/domain/entities/lab-purchase-order.entity';
import { Sample } from '../../../laboratory/domain/entities/sample.entity';
import type { SampleRepositoryPort } from '../../../laboratory/domain/repositories/sample-repository.port';
import { SAMPLE_REPOSITORY } from '../../../laboratory/domain/repositories/sample-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import type {
  CustomerRegisterDto,
  CreatePortalTestingRequestDto,
  UpdatePortalTestingRequestDto,
} from '../../infrastructure/http/dtos/customer-portal.dto';
@Injectable()
export class CustomerPortalService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(USER_ROLE_ASSIGNER_PORT)
    private readonly roleAssigner: UserRoleAssignerPort,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly poRepo: LabPurchaseOrderRepositoryPort,
    @Inject(LAB_ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: LabActivityLogRepositoryPort,
    @Inject(TESTING_SERVICE_REPOSITORY)
    private readonly testingServiceRepo: TestingServiceRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    @Inject(DAILY_REPORT_REPOSITORY)
    private readonly dailyReportRepo: DailyReportRepositoryPort,
    @Inject(SAMPLE_REPOSITORY)
    private readonly sampleRepo: SampleRepositoryPort,
    @Inject(SAMPLE_QUOTA_REPOSITORY)
    private readonly sampleQuotaRepo: SampleQuotaRepositoryPort,
    private readonly jwtService: JwtService,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioService: MinioClientService,
  ) {}

  /** Self-registration: create user + customer record + assign 'customer' role.
   *  Returns success flag; caller must use the unified /auth/login endpoint to obtain JWT. */
  async register(
    dto: CustomerRegisterDto,
  ): Promise<{ success: true; email: string }> {
    // Check email uniqueness
    const exists = await this.userRepo.existsByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(dto.password, 12);

    // Create user account
    const user = new User({
      email: dto.email,
      passwordHash,
      firstName: dto.name,
      lastName: '',
    });
    const savedUser = await this.userRepo.save(user);

    // Assign 'customer' role via raw query (DataSource not injected — use roleAssigner)
    // The roleAssigner looks up roles by ID; we need to look up by name.
    // We do a raw approach: find role ID from the user repo's underlying DS.
    await this.assignCustomerRole(savedUser.id);

    // Create customer record linked to user
    const customer = this.customerRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      contactPerson: dto.contactPerson,
      taxId: dto.taxId,
      status: 'active',
      userId: savedUser.id,
      portalAccess: true,
      portalRegisteredAt: new Date(),
    });
    await this.customerRepo.save(customer);

    return { success: true, email: dto.email };
  }

  /** Get customer profile for logged-in user */
  async getProfile(userId: string): Promise<any> {
    const customer = await this.getCustomerByUserId(userId);
    return customer;
  }

  /** Update portal profile */
  async updateProfile(
    userId: string,
    dto: Partial<{
      phone: string;
      address: string;
      city: string;
      contactPerson: string;
    }>,
  ): Promise<any> {
    const customer = await this.getCustomerByUserId(userId);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  // ---- Lab request methods ----

  /** Browse available testing services (public-ish, but authenticated) */
  async getTestingServices() {
    const result = await this.testingServiceRepo.findAll({
      filters: { isActive: true },
    });
    return result.data;
  }

  /** Submit a new lab testing request from the customer portal */
  async submitTestingRequest(
    userId: string,
    dto: CreatePortalTestingRequestDto,
  ): Promise<TestingRequest> {
    const customer = await this.getCustomerByUserId(userId);

    const lines = dto.lines ?? [];
    const isNewContract =
      dto.billingType === 'contract' && !dto.existingContractId;

    if (isNewContract) {
      if (
        !dto.scopeOfTesting ||
        !dto.contractEstimation ||
        !dto.contractTempoMonths
      ) {
        throw new BadRequestException(
          'New contract requests require scopeOfTesting, contractEstimation, and contractTempoMonths',
        );
      }
    } else if (lines.length < 1) {
      throw new BadRequestException('At least one sample line is required');
    }

    let labContractId: string | null = null;
    let labPurchaseOrderId: string | null = null;

    if (dto.billingType === 'contract') {
      if (dto.existingContractId) {
        const contract = await this.contractRepo.findById(
          dto.existingContractId,
        );
        if (!contract) throw new NotFoundException('Contract not found');
        if (contract.customerId !== (customer.id as string))
          throw new ForbiddenException(
            'Contract does not belong to this customer',
          );
        if (contract.status !== 'active')
          throw new BadRequestException('Only active contracts can be used');
        if (contract.expiresAt && new Date(contract.expiresAt) < new Date())
          throw new BadRequestException(`Contract has expired`);
        labContractId = contract.id;
      }
    } else if (dto.billingType === 'cash') {
      const firstLineServiceId = lines[0]?.testingServiceId ?? '';
      const firstLineServiceName = lines[0]?.serviceName ?? '';
      const lastPONumber = await this.poRepo.getLastPONumber();
      const poNumber = this.generatePONumber(lastPONumber);

      let totalAmount = 0;
      const poLines = await Promise.all(
        lines.map(async (line) => {
          const service = line.testingServiceId
            ? await this.testingServiceRepo
                .findById(line.testingServiceId)
                .catch(() => null)
            : null;
          const unitPrice = Number(service?.unitPrice ?? 0);
          const quantity = line.sampleQuantity ?? 0;
          const total = unitPrice * quantity;
          totalAmount += total;
          return {
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            labPurchaseOrderId: undefined,
            testingServiceId: line.testingServiceId ?? firstLineServiceId,
            serviceName: line.serviceName ?? firstLineServiceName,
            quantity,
            unitPrice,
            total,
          };
        }),
      );

      const po = new LabPurchaseOrder({
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        poNumber,
        customerId: customer.id as string,
        customerName: customer.name ?? '',
        testingServiceId: firstLineServiceId,
        sampleQuantity: lines.reduce(
          (sum, l) => sum + (l.sampleQuantity ?? 0),
          0,
        ),
        totalAmount,
        status: 'draft',
        lines: poLines as any,
      } as any);
      const savedPO = await this.poRepo.save(po);
      labPurchaseOrderId = savedPO.id;
    }

    const lastNumber = await this.testingRequestRepo.getLastRequestNumber();
    const requestNumber = this.generateRequestNumber(lastNumber);

    const entity = new TestingRequest({
      requestNumber,
      customerId: customer.id as string,
      projectName: dto.projectName,
      projectLocation: dto.projectLocation,
      projectAddress: dto.projectAddress,
      sampleQuantity: dto.sampleQuantity,
      priority: dto.priority ?? 'normal',
      notes: dto.notes,
      additionalNotes: dto.additionalNotes ?? null,
      status: 'submitted',
      submittedBy: 'customer',
      customerUserId: userId,
      billingType: dto.billingType ?? 'cash',
      scopeOfTesting: dto.scopeOfTesting ?? null,
      contractEstimation: dto.contractEstimation ?? null,
      contractTempoMonths: dto.contractTempoMonths ?? null,
      labContractId,
      labPurchaseOrderId,
      lines: lines.map((line) => ({
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        testingRequestId: undefined,
        testingServiceId: line.testingServiceId ?? null,
        serviceName: line.serviceName ?? null,
        sampleCode: line.sampleCode ?? null,
        sampleQuantity: line.sampleQuantity,
        notes: line.notes ?? line.sampleNotes ?? null,
      })) as any,
    });

    const savedRequest = await this.testingRequestRepo.save(entity);

    // Create samples for each line, respecting sampleQuantity
    let sampleSeq = 1;

    for (const line of lines) {
      const qty =
        line.sampleQuantity && line.sampleQuantity > 0
          ? line.sampleQuantity
          : 1;
      for (let i = 0; i < qty; i++) {
        const sample = new Sample({
          sampleCode: line.sampleCode
            ? line.sampleCode
            : `SMP-${new Date().getFullYear()}-${String(savedRequest.id).slice(0, 8)}-${sampleSeq.toString().padStart(3, '0')}`,
          sampleTypeId: null,
          sampleTypeName: null,
          testingRequestId: savedRequest.id,
          testingRequestNumber: savedRequest.requestNumber,
          customerId: customer.id as string,
          customerName: customer.name ?? '',
          weight: null,
          location: dto.projectLocation ?? null,
          description: null,
          status: 'awaiting_delivery',
          notes: line.sampleNotes ?? null,
        });
        await this.sampleRepo.save(sample);
        sampleSeq++;
      }
    }

    return savedRequest;
  }

  /** List customer's own testing requests */
  async getMyTestingRequests(
    userId: string,
    options?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const customer = await this.getCustomerByUserId(userId);
    const filters: Record<string, any> = { customerId: customer.id };
    if (options?.status) filters.status = options.status;
    return this.testingRequestRepo.findAll({
      filters,
      search: options?.search,
      page: options?.page,
      limit: options?.limit,
    });
  }

  /** Get one testing request (validates ownership) */
  async getMyTestingRequest(userId: string, requestId: string): Promise<any> {
    const request = await this.testingRequestRepo.findById(requestId);
    if (!request) throw new NotFoundException('Testing request not found');

    // Ownership check: match by customerId (linked via customer record)
    const customer = await this.getCustomerByUserId(userId);
    if (request.customerId !== (customer.id as string)) {
      throw new ForbiddenException('Access denied');
    }

    // Enrich with document readiness flags
    const enriched = { ...request } as any;

    if (request.labPurchaseOrderId) {
      try {
        const po = await this.poRepo.findById(request.labPurchaseOrderId);
        if (po?.documentUrl) {
          const doc = await this.docHelper.getDocument(po.documentUrl);
          enriched.labPurchaseOrderDocumentReady = doc?.status === 'completed';
        }
      } catch {
        enriched.labPurchaseOrderDocumentReady = false;
      }
    }

    // Check invoice document readiness
    if (request.invoiceDocumentUrl) {
      try {
        const doc = await this.docHelper.getDocument(
          request.invoiceDocumentUrl,
        );
        enriched.invoiceDocumentReady = doc?.status === 'completed';
      } catch {
        enriched.invoiceDocumentReady = false;
      }
    }

    // Include sample quotas if granted
    if (request.quotaGranted) {
      try {
        enriched.sampleQuotas =
          await this.sampleQuotaRepo.findByTestingRequestId(request.id);
      } catch {
        enriched.sampleQuotas = [];
      }
    }

    return enriched;
  }

  /** Cancel a draft/submitted request */
  async cancelTestingRequest(
    userId: string,
    requestId: string,
  ): Promise<TestingRequest> {
    const request = await this.getMyTestingRequest(userId, requestId);
    if (!['draft', 'submitted'].includes(request.status)) {
      throw new BadRequestException(
        'Only draft or submitted requests can be cancelled',
      );
    }
    request.status = 'cancelled';
    return this.testingRequestRepo.save(request);
  }

  /** Update a draft/submitted request */
  async updateTestingRequest(
    userId: string,
    requestId: string,
    dto: UpdatePortalTestingRequestDto,
  ): Promise<TestingRequest> {
    const request = await this.getMyTestingRequest(userId, requestId);

    if (!['draft', 'submitted'].includes(request.status)) {
      throw new BadRequestException(
        'Only draft or submitted requests can be edited',
      );
    }

    if (dto.projectName !== undefined) request.projectName = dto.projectName;
    if (dto.projectLocation !== undefined)
      request.projectLocation = dto.projectLocation;
    if (dto.priority !== undefined) request.priority = dto.priority;
    if (dto.notes !== undefined) request.notes = dto.notes;
    if (dto.additionalNotes !== undefined)
      request.additionalNotes = dto.additionalNotes;

    if (dto.lines !== undefined) {
      await this.testingRequestRepo.deleteLinesByRequestId(requestId);

      request.lines = dto.lines.map(
        (line) =>
          new TestingRequestLine({
            testingRequestId: requestId,
            testingServiceId: line.testingServiceId ?? null,
            serviceName: line.serviceName ?? null,
            sampleCode: line.sampleCode ?? null,
            sampleQuantity: line.sampleQuantity ?? 0,
            notes: line.notes ?? line.sampleNotes ?? null,
          }),
      );
    }

    return this.testingRequestRepo.save(request);
  }

  /** Get tracking timeline */
  async trackRequest(userId: string, requestId: string) {
    const request = await this.getMyTestingRequest(userId, requestId);
    const timeline = await this.activityLogRepo.findByTestingRequest(requestId);
    return { request, timeline };
  }

  async getMyTestResults(userId: string, requestId: string) {
    await this.getMyTestingRequest(userId, requestId);
    return this.testResultRepo.findByTestingRequestId(requestId);
  }

  async getMyTestResult(userId: string, resultId: string) {
    const result = await this.testResultRepo.findById(resultId);
    if (!result) throw new NotFoundException('Test result not found');
    if (result.testingRequestId) {
      await this.getMyTestingRequest(userId, result.testingRequestId);
    }
    return result;
  }

  async getMyReports(userId: string, requestId: string) {
    await this.getMyTestingRequest(userId, requestId);
    return this.dailyReportRepo.findAll({
      filters: { testingRequestId: requestId },
    });
  }

  async uploadSignedContract(
    userId: string,
    requestId: string,
    file: any,
  ): Promise<TestingRequest> {
    if (!file) throw new BadRequestException('File is required');
    const request = await this.getMyTestingRequest(userId, requestId);

    if (request.billingType !== 'contract') {
      throw new BadRequestException(
        'Signed contract upload is only for contract billing requests',
      );
    }
    if (request.status !== 'approved') {
      throw new BadRequestException(
        'Signed contract can only be uploaded for approved requests',
      );
    }
    if (request.signedContractUrl) {
      throw new BadRequestException(
        'Signed contract has already been uploaded',
      );
    }
    if (
      request.contractSigningDeadline &&
      new Date(request.contractSigningDeadline) < new Date()
    ) {
      throw new BadRequestException('Contract signing deadline has passed');
    }

    const objectName = `signed-contracts/${requestId}/${Date.now()}_${file.originalname}`;
    const minioPath = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    request.signedContractUrl = minioPath;
    request.signedContractUploadedAt = new Date();
    const saved = await this.testingRequestRepo.save(request);

    return saved;
  }

  async uploadSignedDocumentFile(
    userId: string,
    requestId: string,
    file: any,
  ): Promise<TestingRequest> {
    if (!file) throw new BadRequestException('File is required');
    const request = await this.getMyTestingRequest(userId, requestId);
    if (request.billingType !== 'cash' && request.billingType !== 'contract') {
      throw new BadRequestException(
        'Document upload is not required for this billing type',
      );
    }
    if (!['approved'].includes(request.status)) {
      throw new BadRequestException(
        'Signed document can only be uploaded for approved requests',
      );
    }
    const objectName = `signed-documents/${requestId}/${Date.now()}_${file.originalname}`;
    const minioPath = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    request.signedDocumentUrl = minioPath;
    request.signedDocumentFilename = file.originalname;
    request.signedDocumentUploadedAt = new Date();
    return this.testingRequestRepo.save(request);
  }

  async uploadPaymentProofFile(
    userId: string,
    requestId: string,
    file: any,
  ): Promise<TestingRequest> {
    if (!file) throw new BadRequestException('File is required');
    const request = await this.getMyTestingRequest(userId, requestId);
    // Allow payment proof upload for both cash (signed PO payment) and contract (down payment)
    if (request.billingType !== 'cash' && request.billingType !== 'contract') {
      throw new BadRequestException(
        'Payment proof upload is not required for this billing type',
      );
    }
    if (!['approved'].includes(request.status)) {
      throw new BadRequestException(
        'Payment proof can only be uploaded for approved requests',
      );
    }
    const objectName = `payment-proofs/${requestId}/${Date.now()}_${file.originalname}`;
    const minioPath = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    request.paymentProofUrl = minioPath;
    request.paymentProofFilename = file.originalname;
    request.paymentProofUploadedAt = new Date();
    return this.testingRequestRepo.save(request);
  }

  async getSignedDocumentUrl(userId: string, requestId: string) {
    const request = await this.getMyTestingRequest(userId, requestId);
    if (!request.signedDocumentUrl) {
      throw new NotFoundException('No signed document uploaded');
    }
    // Backward compat: if it's an external URL, return as-is
    if (request.signedDocumentUrl.startsWith('http')) {
      return {
        url: request.signedDocumentUrl,
        filename: request.signedDocumentFilename,
      };
    }
    const objectName = request.signedDocumentUrl.replace('documents/', '');
    const url = this.minioService.getPublicDownloadUrl('documents', objectName);
    return { url, filename: request.signedDocumentFilename };
  }

  async getPaymentProofUrl(userId: string, requestId: string) {
    const request = await this.getMyTestingRequest(userId, requestId);
    if (!request.paymentProofUrl) {
      throw new NotFoundException('No payment proof uploaded');
    }
    if (request.paymentProofUrl.startsWith('http')) {
      return {
        url: request.paymentProofUrl,
        filename: request.paymentProofFilename,
      };
    }
    const objectName = request.paymentProofUrl.replace('documents/', '');
    const url = this.minioService.getPublicDownloadUrl('documents', objectName);
    return { url, filename: request.paymentProofFilename };
  }

  async deleteSignedDocumentFile(
    userId: string,
    requestId: string,
  ): Promise<TestingRequest> {
    const request = await this.getMyTestingRequest(userId, requestId);
    if (!request.signedDocumentUrl) {
      throw new NotFoundException('No signed document uploaded');
    }
    if (!request.signedDocumentUrl.startsWith('http')) {
      const objectName = request.signedDocumentUrl.replace('documents/', '');
      await this.minioService.deleteFile('documents', objectName);
    }
    request.signedDocumentUrl = null;
    request.signedDocumentFilename = null;
    request.signedDocumentUploadedAt = null;
    return this.testingRequestRepo.save(request);
  }

  async deletePaymentProofFile(
    userId: string,
    requestId: string,
  ): Promise<TestingRequest> {
    const request = await this.getMyTestingRequest(userId, requestId);
    if (!request.paymentProofUrl) {
      throw new NotFoundException('No payment proof uploaded');
    }
    if (!request.paymentProofUrl.startsWith('http')) {
      const objectName = request.paymentProofUrl.replace('documents/', '');
      await this.minioService.deleteFile('documents', objectName);
    }
    request.paymentProofUrl = null;
    request.paymentProofFilename = null;
    request.paymentProofUploadedAt = null;
    return this.testingRequestRepo.save(request);
  }

  async getMyContracts(userId: string) {
    const customer = await this.getCustomerByUserId(userId);
    return this.contractRepo.findAll({
      filters: { customerId: customer.id, status: 'active' },
    });
  }

  async getMyContract(userId: string, contractId: string) {
    const customer = await this.getCustomerByUserId(userId);
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.customerId !== customer.id)
      throw new ForbiddenException('Access denied');
    return contract;
  }

  async getMyPurchaseOrders(userId: string) {
    const customer = await this.getCustomerByUserId(userId);
    return this.poRepo.findAll({ filters: { customerId: customer.id } });
  }

  async getMyPurchaseOrder(userId: string, poId: string) {
    const customer = await this.getCustomerByUserId(userId);
    const po = await this.poRepo.findById(poId);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.customerId !== customer.id)
      throw new ForbiddenException('Access denied');
    return po;
  }

  async getLabPODocumentUrl(userId: string, poId: string) {
    const customer = await this.getCustomerByUserId(userId);
    const po = await this.poRepo.findById(poId);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.customerId !== customer.id)
      throw new ForbiddenException('Access denied');
    if (!po.documentUrl)
      throw new NotFoundException('Document not yet generated');

    const doc = await this.docHelper.getDocument(po.documentUrl);
    if (!doc || doc.status !== 'completed') {
      throw new NotFoundException('Document not ready');
    }

    const url = await this.docHelper.getDownloadUrl(doc.id);

    return {
      url,
      filename: doc.fileName,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  async getInvoiceDocumentUrl(userId: string, requestId: string) {
    const customer = await this.getCustomerByUserId(userId);
    const request = await this.testingRequestRepo.findById(requestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (request.customerId !== customer.id)
      throw new ForbiddenException('Access denied');
    if (!request.invoiceDocumentUrl)
      throw new NotFoundException('Invoice document not yet generated');

    const doc = await this.docHelper.getDocument(request.invoiceDocumentUrl);
    if (!doc || doc.status !== 'completed') {
      throw new NotFoundException('Invoice document not ready');
    }

    const url = await this.docHelper.getDownloadUrl(doc.id);

    return {
      url,
      filename: doc.fileName,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  async getDashboard(userId: string) {
    const customer = await this.getCustomerByUserId(userId);
    const myRequests = await this.testingRequestRepo.findAll({
      filters: { customerId: customer.id },
      limit: 1000,
    });
    const myContracts = await this.contractRepo.findAll({
      filters: { customerId: customer.id, status: 'active' },
      limit: 1000,
    });
    const myReports = await this.testingRequestRepo.findAll({
      filters: { customerId: customer.id, status: 'completed' },
      limit: 1000,
    });

    const quotaData = myContracts.data.map((c) => ({
      contractNumber: c.contractNumber,
      totalQuota: c.totalQuota ?? 0,
      usedQuota: c.usedQuota ?? 0,
      remainingQuota: c.remainingQuota ?? 0,
    }));

    return {
      testingRequests: myRequests.meta.total,
      requestBreakdown: {
        submitted: (
          await this.testingRequestRepo.findAll({
            filters: { customerId: customer.id, status: 'submitted' },
            limit: 1,
          })
        ).meta.total,
        approved: (
          await this.testingRequestRepo.findAll({
            filters: { customerId: customer.id, status: 'approved' },
            limit: 1,
          })
        ).meta.total,
        completed: myReports.meta.total,
      },
      quota: quotaData,
    };
  }

  // ---- private helpers ----

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
    const year = new Date().getFullYear().toString().slice(-2);
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/PO-\d{2}-(\d+)/);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `PO-${year}-${seq.toString().padStart(5, '0')}`;
  }

  private async getCustomerByUserId(userId: string): Promise<any> {
    // First try direct userId link (customers registered via portal)
    let customer = await this.customerRepo.findByUserId?.(userId);
    if (customer) return customer;

    // Fallback: look up user email, then find customer by email
    // (handles customers created in admin before portal registration)
    const user = await this.userRepo.findById(userId);
    if (user?.email) {
      customer = await this.customerRepo.findByEmail?.(user.email);
      if (customer) {
        // Link the userId to the customer record for future lookups
        customer.userId = userId;
        customer.portalAccess = true;
        await this.customerRepo.save(customer);
        return customer;
      }
    }

    throw new NotFoundException('Customer profile not found');
  }

  private async assignCustomerRole(userId: string): Promise<void> {
    // Use raw SQL via DataSource injected into userRepo (adapter pattern)
    // We call roleAssigner which takes roleIds. We need to resolve 'customer' role ID first.
    // Since UserRoleAssignerPort takes IDs, we do a direct DB call via the
    // UserTypeOrmRepository's underlying DataSource.
    try {
      await (this.userRepo as any).dataSource?.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, r.id FROM roles r WHERE r.name = 'customer'
         ON CONFLICT DO NOTHING`,
        [userId],
      );
    } catch {
      // If dataSource not accessible via repo, log and continue — role can be assigned manually
    }
  }
}
