import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { ContractInvoice } from '../../domain/entities/contract-invoice.entity';
import { ContractInvoiceTypeOrmEntity } from '../entities/contract-invoice-typeorm.entity';
import { ContractInvoiceRepositoryPort } from '../../domain/repositories/contract-invoice-repository.port';
import {
  FindOptions,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';

@Injectable()
export class ContractInvoiceTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    ContractInvoice,
    ContractInvoiceTypeOrmEntity
  >
  implements ContractInvoiceRepositoryPort
{
  protected readonly repository: Repository<ContractInvoiceTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(ContractInvoiceTypeOrmEntity);
  }

  toDomain(entity: ContractInvoiceTypeOrmEntity): ContractInvoice {
    return new ContractInvoice({
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      contractId: entity.contractId,
      billingPeriodStart: entity.billingPeriodStart,
      billingPeriodEnd: entity.billingPeriodEnd,
      totalSamples: entity.totalSamples ?? 0,
      baseAmount: Number(entity.baseAmount ?? 0),
      taxPercent: Number(entity.taxPercent ?? 11),
      taxAmount: Number(entity.taxAmount ?? 0),
      totalAmount: Number(entity.totalAmount ?? 0),
      invoiceDocumentUrl: entity.invoiceDocumentUrl,
      status: entity.status as ContractInvoice['status'],
      paidAt: entity.paidAt,
      paidAmount: entity.paidAmount ? Number(entity.paidAmount) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: ContractInvoice): ContractInvoiceTypeOrmEntity {
    const entity = new ContractInvoiceTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.invoiceNumber = domain.invoiceNumber;
    entity.contractId = domain.contractId;
    entity.billingPeriodStart = domain.billingPeriodStart;
    entity.billingPeriodEnd = domain.billingPeriodEnd;
    entity.totalSamples = domain.totalSamples ?? 0;
    entity.baseAmount = domain.baseAmount ?? 0;
    entity.taxPercent = domain.taxPercent ?? 11;
    entity.taxAmount = domain.taxAmount ?? 0;
    entity.totalAmount = domain.totalAmount ?? 0;
    entity.invoiceDocumentUrl = domain.invoiceDocumentUrl ?? null;
    entity.status = domain.status ?? 'issued';
    entity.paidAt = domain.paidAt as any;
    entity.paidAmount = domain.paidAmount ?? null;
    return entity;
  }

  async findById(id: string): Promise<ContractInvoice | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByContractId(contractId: string): Promise<ContractInvoice[]> {
    const entities = await this.repository.find({
      where: { contractId, deletedAt: IsNull() } as any,
      order: { billingPeriodStart: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByBillingPeriod(
    contractId: string,
    start: Date,
    end: Date,
  ): Promise<ContractInvoice | null> {
    const entity = await this.repository
      .createQueryBuilder('i')
      .where('i.contract_id = :contractId', { contractId })
      .andWhere('i.billing_period_start = :start', { start })
      .andWhere('i.billing_period_end = :end', { end })
      .andWhere('i.deleted_at IS NULL')
      .getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async getLastInvoiceNumber(): Promise<string | null> {
    const entity = await this.repository.findOne({
      where: { deletedAt: IsNull() } as any,
      order: { invoiceNumber: 'DESC' as any },
      select: ['invoiceNumber'] as any,
    });
    return entity?.invoiceNumber ?? null;
  }

  async findAll(options?: FindOptions): Promise<FindResult<ContractInvoice>> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { ...(options?.filters as any), deletedAt: IsNull() },
      take: limit,
      skip,
      order: options?.orderBy
        ? ({ [options.orderBy]: options.orderDirection ?? 'ASC' } as any)
        : undefined,
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

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
