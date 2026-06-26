import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  TestingRequest,
  TestingRequestLine,
} from '../../domain/entities/testing-request.entity';
import { TestingRequestTypeOrmEntity } from '../entities/testing-request-typeorm.entity';
import { TestingRequestLineTypeOrmEntity } from '../entities/testing-request-line-typeorm.entity';
import { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { FindOptions, FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';

@Injectable()
export class TestingRequestTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    TestingRequest,
    TestingRequestTypeOrmEntity
  >
  implements TestingRequestRepositoryPort
{
  protected readonly repository: Repository<TestingRequestTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingRequestTypeOrmEntity);
  }

  protected searchableColumns(): string[] {
    return ['requestNumber', 'projectName', 'projectLocation'];
  }

  toDomain(entity: TestingRequestTypeOrmEntity): TestingRequest {
    return new TestingRequest({
      id: entity.id,
      requestNumber: entity.requestNumber,
      customerId: entity.customerId,
      customerName: (entity as any).customerName ?? undefined,
      projectName: entity.projectName,
      projectLocation: entity.projectLocation,
      testingType: entity.testingType,
      sampleQuantity: entity.sampleQuantity,
      scheduleDate: entity.scheduleDate,
      notes: entity.notes,
      status: entity.status as TestingRequest['status'],
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      rejectionReason: entity.rejectionReason,
      submittedBy: (entity.submittedBy as 'admin' | 'customer') ?? 'admin',
      customerUserId: entity.customerUserId ?? undefined,
      projectAddress: entity.projectAddress ?? undefined,
      preferredScheduleDate: entity.preferredScheduleDate ?? undefined,
      priority: (entity.priority as 'normal' | 'urgent') ?? 'normal',
      billingType: (entity.billingType as 'contract' | 'cash') ?? undefined,
      testingServiceId: entity.testingServiceId ?? undefined,
      serviceName: entity.serviceName ?? undefined,
      labContractId: entity.labContractId ?? undefined,
      labPurchaseOrderId: entity.labPurchaseOrderId ?? undefined,
      salesOrderId: entity.salesOrderId ?? undefined,
      assignedLaboranId: entity.assignedLaboranId ?? undefined,
      assignedLaboranName: entity.assignedLaboranName ?? undefined,
      assignedAt: entity.assignedAt ?? undefined,
      assignmentNotes: entity.assignmentNotes ?? undefined,
      additionalNotes: entity.additionalNotes ?? undefined,
      invoiceDocumentUrl: entity.invoiceDocumentUrl ?? undefined,
      contractDocumentUrl: (entity as any).contractDocumentUrl ?? undefined,
      downPaymentAmount: entity.downPaymentAmount != null ? Number(entity.downPaymentAmount) : undefined,
      poDocumentUrl: entity.poDocumentUrl ?? undefined,
      signedDocumentUrl: entity.signedDocumentUrl ?? undefined,
      signedDocumentFilename: entity.signedDocumentFilename ?? undefined,
      signedDocumentUploadedAt: entity.signedDocumentUploadedAt ?? undefined,
      paymentProofUrl: entity.paymentProofUrl ?? undefined,
      paymentProofFilename: entity.paymentProofFilename ?? undefined,
      paymentProofUploadedAt: entity.paymentProofUploadedAt ?? undefined,
      documentVerifiedAt: entity.documentVerifiedAt ?? undefined,
      documentVerifiedBy: entity.documentVerifiedBy ?? undefined,
      quotaGranted: entity.quotaGranted ?? false,
      quotaGrantedAt: entity.quotaGrantedAt ?? undefined,
      quotaGrantedBy: entity.quotaGrantedBy ?? undefined,
      scopeOfTesting: entity.scopeOfTesting ?? undefined,
      contractEstimation: entity.contractEstimation ?? undefined,
      contractTempoMonths: entity.contractTempoMonths ?? undefined,
      signedContractUrl: entity.signedContractUrl ?? undefined,
      signedContractUploadedAt: entity.signedContractUploadedAt ?? undefined,
      contractSigningDeadline: entity.contractSigningDeadline ?? undefined,
      contractConfirmedAt: entity.contractConfirmedAt ?? undefined,
      contractConfirmedBy: entity.contractConfirmedBy ?? undefined,
      isUnlimited: entity.isUnlimited ?? false,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new TestingRequestLine({
                id: line.id,
                testingRequestId: line.testingRequestId,
                testingServiceId: line.testingServiceId,
                serviceName: line.serviceName,
                sampleCode: line.sampleCode ?? null,
                sampleDescription: line.sampleDescription ?? null,
                sampleQuantity: line.sampleQuantity,
                notes: line.notes,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestingRequest): TestingRequestTypeOrmEntity {
    const entity = new TestingRequestTypeOrmEntity();
    entity.id = domain.id;
    entity.requestNumber = domain.requestNumber;
    entity.customerId = domain.customerId || (null as any);
    entity.projectName = domain.projectName ?? '';
    entity.projectLocation = domain.projectLocation ?? '';
    entity.testingType = domain.testingType ?? '';
    entity.sampleQuantity = domain.sampleQuantity ?? 0;
    entity.scheduleDate = domain.scheduleDate
      ? new Date(domain.scheduleDate)
      : new Date();
    entity.notes = domain.notes ?? '';
    entity.status = domain.status ?? 'draft';
    entity.createdBy = domain.createdBy ?? '';
    entity.approvedBy = domain.approvedBy ?? '';
    entity.approvedAt = domain.approvedAt
      ? domain.approvedAt instanceof Date
        ? domain.approvedAt
        : new Date(domain.approvedAt)
      : undefined;
    entity.rejectionReason = domain.rejectionReason ?? '';
    entity.submittedBy = domain.submittedBy ?? 'admin';
    entity.customerUserId = domain.customerUserId ?? null;
    entity.projectAddress = domain.projectAddress ?? null;
    entity.preferredScheduleDate = domain.preferredScheduleDate
      ? domain.preferredScheduleDate instanceof Date
        ? domain.preferredScheduleDate
        : new Date(domain.preferredScheduleDate)
      : null;
    entity.priority = domain.priority ?? 'normal';
    entity.billingType = domain.billingType ?? null;
    entity.testingServiceId = domain.testingServiceId ?? null;
    entity.serviceName = domain.serviceName ?? null;
    entity.labContractId = domain.labContractId ?? null;
    entity.labPurchaseOrderId = domain.labPurchaseOrderId ?? null;
    entity.salesOrderId = domain.salesOrderId ?? null;
    entity.additionalNotes = domain.additionalNotes ?? null;
    entity.invoiceDocumentUrl = domain.invoiceDocumentUrl ?? null;
    (entity as any).contractDocumentUrl = domain.contractDocumentUrl ?? null;
    entity.downPaymentAmount = domain.downPaymentAmount ?? 0;
    entity.poDocumentUrl = domain.poDocumentUrl ?? null;
    entity.signedDocumentUrl = domain.signedDocumentUrl ?? null;
    entity.signedDocumentFilename = domain.signedDocumentFilename ?? null;
    entity.signedDocumentUploadedAt = domain.signedDocumentUploadedAt ?? null;
    entity.paymentProofUrl = domain.paymentProofUrl ?? null;
    entity.paymentProofFilename = domain.paymentProofFilename ?? null;
    entity.paymentProofUploadedAt = domain.paymentProofUploadedAt ?? null;
    entity.documentVerifiedAt = domain.documentVerifiedAt ?? null;
    entity.documentVerifiedBy = domain.documentVerifiedBy ?? null;
    entity.quotaGranted = domain.quotaGranted ?? false;
    entity.quotaGrantedAt = domain.quotaGrantedAt ?? null;
    entity.quotaGrantedBy = domain.quotaGrantedBy ?? null;
    entity.scopeOfTesting = domain.scopeOfTesting ?? null;
    entity.contractEstimation = domain.contractEstimation ?? null;
    entity.contractTempoMonths = domain.contractTempoMonths ?? null;
    entity.signedContractUrl = domain.signedContractUrl ?? null;
    entity.signedContractUploadedAt = domain.signedContractUploadedAt ?? null;
    entity.contractSigningDeadline = domain.contractSigningDeadline ?? null;
    entity.contractConfirmedAt = domain.contractConfirmedAt ?? null;
    entity.contractConfirmedBy = domain.contractConfirmedBy ?? null;
    entity.isUnlimited = domain.isUnlimited ?? false;
    entity.assignedLaboranId = domain.assignedLaboranId ?? null;
    entity.assignedLaboranName = domain.assignedLaboranName ?? null;
    entity.assignedAt = domain.assignedAt ?? null;
    entity.assignmentNotes = domain.assignmentNotes ?? null;
    entity.lines =
      domain.lines?.map((line) => {
        const lineEntity = new TestingRequestLineTypeOrmEntity();
        lineEntity.id = line.id;
        lineEntity.testingRequestId = line.testingRequestId || (null as any);
        lineEntity.testingServiceId = line.testingServiceId;
        lineEntity.serviceName = line.serviceName;
        lineEntity.sampleCode = line.sampleCode ?? null;
        lineEntity.sampleDescription = line.sampleDescription ?? null;
        lineEntity.sampleQuantity = line.sampleQuantity;
        lineEntity.notes = line.notes ?? '';
        return lineEntity;
      }) ?? [];
    return entity;
  }

  async findById(id: string): Promise<TestingRequest | null> {
    const entity = await this.repository.findOne({
      where: { id } as any,
      relations: ['lines'],
    });
    if (!entity) return null;

    const customerRows = await this.dataSource.query(
      `SELECT name FROM customers WHERE id = $1`,
      [entity.customerId],
    );
    if (customerRows?.length > 0) {
      (entity as any).customerName = customerRows[0].name;
    }

    return this.toDomain(entity);
  }

  async findByRequestNumber(
    requestNumber: string,
  ): Promise<TestingRequest | null> {
    const entity = await this.repository.findOne({
      where: { requestNumber },
      relations: ['lines'],
    });
    if (!entity) return null;

    const customerRows = await this.dataSource.query(
      `SELECT name FROM customers WHERE id = $1`,
      [entity.customerId],
    );
    if (customerRows?.length > 0) {
      (entity as any).customerName = customerRows[0].name;
    }

    return this.toDomain(entity);
  }

  async getLastRequestNumber(): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('tr')
      .select('tr.request_number', 'requestNumber')
      .orderBy('tr.request_number', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.requestNumber ?? null;
  }

  async deleteLinesByRequestId(requestId: string): Promise<void> {
    await this.dataSource
      .getRepository(TestingRequestLineTypeOrmEntity)
      .delete({ testingRequestId: requestId });
  }

  async findExpiredUnsignedContracts(now: Date): Promise<TestingRequest[]> {
    const entities = await this.repository.createQueryBuilder('r')
      .where('r.billing_type = :bt', { bt: 'contract' })
      .andWhere('r.status = :status', { status: 'approved' })
      .andWhere('r.contract_signing_deadline IS NOT NULL')
      .andWhere('r.contract_signing_deadline < :now', { now })
      .andWhere('r.signed_contract_url IS NULL')
      .getMany();
    return entities.map(e => this.toDomain(e));
  }
}
