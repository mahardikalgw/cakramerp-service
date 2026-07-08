import { Injectable } from '@nestjs/common';
import { DataSource, ILike, IsNull, Or, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import {
  PostApprovalLabContract,
  LabContractSample,
} from '../../domain/entities/post-approval-lab-contract.entity';
import { LabContractTypeOrmEntity } from '../entities/lab-contract-typeorm.entity';
import { PostApprovalLabContractSampleTypeOrmEntity } from '../entities/post-approval-lab-contract-sample-typeorm.entity';
import { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import {
  FindOptions,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';

@Injectable()
export class PostApprovalLabContractTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    PostApprovalLabContract,
    LabContractTypeOrmEntity
  >
  implements PostApprovalLabContractRepositoryPort
{
  protected readonly repository: Repository<LabContractTypeOrmEntity>;
  private readonly sampleRepo: Repository<PostApprovalLabContractSampleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LabContractTypeOrmEntity);
    this.sampleRepo = dataSource.getRepository(
      PostApprovalLabContractSampleTypeOrmEntity,
    );
  }

  private loadSamples(
    contractId: string,
  ): Promise<PostApprovalLabContractSampleTypeOrmEntity[]> {
    return this.sampleRepo.find({
      where: { contractId, deletedAt: IsNull() } as any,
    });
  }

  private toContractSample(
    entity: PostApprovalLabContractSampleTypeOrmEntity,
  ): LabContractSample {
    return new LabContractSample({
      id: entity.id,
      contractId: entity.contractId,
      sampleId: entity.sampleId,
      testingServiceId: entity.testingServiceId,
      serviceName: entity.serviceName,
      sampleCode: entity.sampleCode,
      sampleQuantity: entity.sampleQuantity ?? 1,
      usedQuantity: entity.usedQuantity ?? 0,
      completedQuantity: entity.completedQuantity ?? 0,
      unitPrice: Number(entity.unitPrice ?? 0),
      totalPrice: Number(entity.totalPrice ?? 0),
      status: entity.status as LabContractSample['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async findById(id: string): Promise<PostApprovalLabContract | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
    if (!entity) return null;
    const contract = this.toDomain(entity);
    const sampleEntities = await this.loadSamples(id);
    contract.lines = sampleEntities.map((s) => this.toContractSample(s));
    return contract;
  }

  async findAll(
    options?: FindOptions,
  ): Promise<FindResult<PostApprovalLabContract>> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const skip = (page - 1) * limit;
    const search = options?.search;

    let where: any = {
      ...(options?.filters ?? {}),
      deletedAt: IsNull(),
    };

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const baseFilters = {
        ...(options?.filters ?? {}),
        deletedAt: IsNull(),
      };
      where = [
        { ...baseFilters, contractNumber: ILike(term) },
        { ...baseFilters, projectName: ILike(term) },
        { ...baseFilters, customerName: ILike(term) },
      ];
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      take: limit,
      skip,
      order: options?.orderBy
        ? ({ [options.orderBy]: options.orderDirection ?? 'ASC' } as any)
        : ({ createdAt: 'DESC' } as any),
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: entities.map((e) => this.toDomain(e)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  toDomain(entity: LabContractTypeOrmEntity): PostApprovalLabContract {
    return new PostApprovalLabContract({
      id: entity.id,
      contractNumber: entity.contractNumber,
      testingRequestId: entity.testingRequestId ?? '',
      customerId: entity.customerId,
      customerName: entity.customerName,
      projectName: entity.projectName,
      projectLocation: entity.projectLocation,
      billingType: entity.billingType,
      totalQuota: entity.totalQuota ?? 0,
      usedQuota: entity.usedQuota ?? 0,
      remainingQuota: entity.remainingQuota ?? 0,
      baseAmount: Number(entity.baseAmount ?? 0),
      taxPercent: Number(entity.taxPercent ?? 11),
      taxAmount: Number(entity.taxAmount ?? 0),
      totalAmount: Number(entity.totalAmount ?? 0),
      initialFee: Number((entity as any).initialFee ?? 0),
      contractDocumentUrl: entity.contractDocumentUrl,
      taxInvoiceUrl: entity.taxInvoiceUrl,
      status: entity.status as PostApprovalLabContract['status'],
      generatedAt: entity.generatedAt,
      generatedBy: entity.generatedBy,
      generatedByName: entity.generatedByName,
      expiresAt: entity.expiresAt ?? null,
      isUnlimited: entity.isUnlimited ?? false,
      billingStartDate: entity.billingStartDate ?? null,
      lastBillingDate: entity.lastBillingDate ?? null,
      scopeOfTesting: entity.scopeOfTesting ?? null,
      contractEstimation: entity.contractEstimation ?? null,
      contractTempoDays: entity.contractTempoDays ?? null,
      signedContractUrl: entity.signedContractUrl ?? null,
      contractSigningDeadline: entity.contractSigningDeadline ?? null,
      contractConfirmedAt: entity.contractConfirmedAt ?? null,
      contractConfirmedBy: entity.contractConfirmedBy ?? null,
      closedAt: (entity as any).closedAt ?? null,
      closedBy: (entity as any).closedBy ?? null,
      closedByName: (entity as any).closedByName ?? null,
      allowedServiceIds: entity.allowedServiceIds ?? null,
      lines: [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PostApprovalLabContract): LabContractTypeOrmEntity {
    const entity = new LabContractTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.contractNumber = domain.contractNumber;
    entity.testingRequestId = domain.testingRequestId;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.projectName = domain.projectName ?? '';
    entity.projectLocation = domain.projectLocation ?? '';
    entity.billingType = domain.billingType ?? '';
    entity.totalQuota = domain.totalQuota ?? 0;
    entity.usedQuota = domain.usedQuota ?? 0;
    entity.remainingQuota = domain.remainingQuota ?? 0;
    entity.baseAmount = domain.baseAmount ?? 0;
    entity.taxPercent = domain.taxPercent ?? 11;
    entity.taxAmount = domain.taxAmount ?? 0;
    entity.totalAmount = domain.totalAmount ?? 0;
    (entity as any).initialFee = domain.initialFee ?? 0;
    entity.contractDocumentUrl = domain.contractDocumentUrl ?? '';
    entity.taxInvoiceUrl = domain.taxInvoiceUrl ?? '';
    entity.status = domain.status;
    entity.generatedAt = domain.generatedAt as any;
    entity.generatedBy = domain.generatedBy ?? '';
    entity.generatedByName = domain.generatedByName ?? '';
    entity.expiresAt = domain.expiresAt as any;
    entity.isUnlimited = domain.isUnlimited ?? false;
    entity.billingStartDate = domain.billingStartDate as any;
    entity.lastBillingDate = domain.lastBillingDate as any;
    entity.scopeOfTesting = domain.scopeOfTesting ?? null;
    entity.contractEstimation = domain.contractEstimation ?? null;
    entity.contractTempoDays = domain.contractTempoDays ?? null;
    entity.signedContractUrl = domain.signedContractUrl ?? null;
    entity.contractSigningDeadline = domain.contractSigningDeadline as any;
    entity.contractConfirmedAt = domain.contractConfirmedAt as any;
    entity.contractConfirmedBy = domain.contractConfirmedBy ?? null;
    (entity as any).closedAt = domain.closedAt ?? null;
    (entity as any).closedBy = domain.closedBy ?? null;
    (entity as any).closedByName = domain.closedByName ?? null;
    entity.allowedServiceIds = domain.allowedServiceIds ?? null;
    return entity;
  }

  async findByContractNumber(
    contractNumber: string,
  ): Promise<PostApprovalLabContract | null> {
    const entity = await this.repository.findOne({
      where: { contractNumber, deletedAt: IsNull() },
    });
    if (!entity) return null;
    const contract = this.toDomain(entity);
    const sampleEntities = await this.loadSamples(contract.id);
    contract.lines = sampleEntities.map((s) => this.toContractSample(s));
    return contract;
  }

  async findByTestingRequestId(
    testingRequestId: string,
  ): Promise<PostApprovalLabContract | null> {
    const entity = await this.repository.findOne({
      where: { testingRequestId, deletedAt: IsNull() },
    });
    if (!entity) return null;
    const contract = this.toDomain(entity);
    const sampleEntities = await this.loadSamples(contract.id);
    contract.lines = sampleEntities.map((s) => this.toContractSample(s));
    return contract;
  }

  async getLastContractNumber(): Promise<string | null> {
    // NOTE: intentionally includes soft-deleted records so the sequence
    // number is not reused, which would violate the unique constraint.
    const entities = await this.repository.find({
      order: { contractNumber: 'DESC' as any },
      take: 1,
    });
    return entities[0]?.contractNumber ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
