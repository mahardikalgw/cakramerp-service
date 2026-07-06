import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import {
  ContractTestInvoice,
  ContractTestInvoiceLine,
} from '../../domain/entities/contract-test-invoice.entity';
import { ContractTestInvoiceTypeOrmEntity } from '../entities/contract-test-invoice-typeorm.entity';
import { ContractTestInvoiceResultTypeOrmEntity } from '../entities/contract-test-invoice-result-typeorm.entity';
import { ContractTestInvoiceRepositoryPort } from '../../domain/repositories/contract-test-invoice-repository.port';
import {
  FindOptions,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';

@Injectable()
export class ContractTestInvoiceTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    ContractTestInvoice,
    ContractTestInvoiceTypeOrmEntity
  >
  implements ContractTestInvoiceRepositoryPort
{
  protected readonly repository: Repository<ContractTestInvoiceTypeOrmEntity>;
  private readonly lineRepo: Repository<ContractTestInvoiceResultTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(
      ContractTestInvoiceTypeOrmEntity,
    );
    this.lineRepo = dataSource.getRepository(
      ContractTestInvoiceResultTypeOrmEntity,
    );
  }

  // ─── Mapping ────────────────────────────────────────────────────────────

  private toLineDomain(
    entity: ContractTestInvoiceResultTypeOrmEntity,
  ): ContractTestInvoiceLine {
    return new ContractTestInvoiceLine({
      id: entity.id,
      invoiceId: entity.invoiceId,
      testResultId: entity.testResultId,
      serviceName: entity.serviceName,
      sampleCode: entity.sampleCode,
      unitPrice: Number(entity.unitPrice ?? 0),
      quantity: entity.quantity ?? 1,
      totalPrice: Number(entity.totalPrice ?? 0),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toDomain(entity: ContractTestInvoiceTypeOrmEntity): ContractTestInvoice {
    const lines = (entity.lines ?? []).map((l) => this.toLineDomain(l));
    return new ContractTestInvoice({
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      contractId: entity.contractId,
      testingScheduleId: entity.testingScheduleId,
      billingPeriodStart: entity.billingPeriodStart,
      billingPeriodEnd: entity.billingPeriodEnd,
      totalSamples: entity.totalSamples ?? 0,
      baseAmount: Number(entity.baseAmount ?? 0),
      taxPercent: Number(entity.taxPercent ?? 11),
      taxAmount: Number(entity.taxAmount ?? 0),
      totalAmount: Number(entity.totalAmount ?? 0),
      initialFeeApplied: Number(entity.initialFeeApplied ?? 0),
      amountDue: Number(entity.amountDue ?? 0),
      status: entity.status as ContractTestInvoice['status'],
      dueDate: entity.dueDate,
      issuedAt: entity.issuedAt,
      paidAt: entity.paidAt,
      paidAmount: entity.paidAmount ? Number(entity.paidAmount) : null,
      invoiceDocumentUrl: entity.invoiceDocumentUrl,
      paymentProofUrl: entity.paymentProofUrl,
      paymentProofFilename: entity.paymentProofFilename,
      paymentProofUploadedAt: entity.paymentProofUploadedAt,
      paymentVerifiedAt: entity.paymentVerifiedAt,
      paymentVerifiedBy: entity.paymentVerifiedBy,
      paymentVerifiedByName: entity.paymentVerifiedByName,
      notes: entity.notes,
      lines,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: ContractTestInvoice): ContractTestInvoiceTypeOrmEntity {
    const entity = new ContractTestInvoiceTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.invoiceNumber = domain.invoiceNumber;
    entity.contractId = domain.contractId;
    entity.testingScheduleId = domain.testingScheduleId ?? null;
    entity.billingPeriodStart = domain.billingPeriodStart;
    entity.billingPeriodEnd = domain.billingPeriodEnd;
    entity.totalSamples = domain.totalSamples ?? 0;
    entity.baseAmount = domain.baseAmount ?? 0;
    entity.taxPercent = domain.taxPercent ?? 11;
    entity.taxAmount = domain.taxAmount ?? 0;
    entity.totalAmount = domain.totalAmount ?? 0;
    entity.initialFeeApplied = domain.initialFeeApplied ?? 0;
    entity.amountDue = domain.amountDue ?? 0;
    entity.status = domain.status ?? 'draft';
    entity.dueDate = domain.dueDate as any;
    entity.issuedAt = domain.issuedAt as any;
    entity.paidAt = domain.paidAt as any;
    entity.paidAmount = domain.paidAmount ?? null;
    entity.invoiceDocumentUrl = domain.invoiceDocumentUrl ?? null;
    entity.paymentProofUrl = domain.paymentProofUrl ?? null;
    entity.paymentProofFilename = domain.paymentProofFilename ?? null;
    entity.paymentProofUploadedAt = domain.paymentProofUploadedAt as any;
    entity.paymentVerifiedAt = domain.paymentVerifiedAt as any;
    entity.paymentVerifiedBy = domain.paymentVerifiedBy ?? null;
    entity.paymentVerifiedByName = domain.paymentVerifiedByName ?? null;
    entity.notes = domain.notes ?? null;
    return entity;
  }

  // ─── Read helpers ───────────────────────────────────────────────────────

  async findById(id: string): Promise<ContractTestInvoice | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByContractId(contractId: string): Promise<ContractTestInvoice[]> {
    const entities = await this.repository.find({
      where: { contractId, deletedAt: IsNull() } as any,
      order: { billingPeriodEnd: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByScheduleId(scheduleId: string): Promise<ContractTestInvoice[]> {
    const entities = await this.repository.find({
      where: { testingScheduleId: scheduleId, deletedAt: IsNull() } as any,
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByCustomerId(
    customerId: string,
    options?: { status?: string; page?: number; limit?: number },
  ): Promise<{ data: ContractTestInvoice[]; total: number }> {
    const limit = options?.limit ?? 15;
    const page = options?.page ?? 1;
    const skip = (page - 1) * limit;
    const where: any = { contractId: undefined };
    // Customer-scoped invoices are derived from contracts belonging to the
    // customer. We do a subquery so the customer only sees their own.
    const qb = this.repository
      .createQueryBuilder('i')
      .innerJoin('lab_contracts', 'c', 'c.id = i.contract_id')
      .where('c.customer_id = :customerId', { customerId })
      .andWhere('i.deleted_at IS NULL')
      .orderBy('i.billingPeriodEnd', 'DESC')
      .addOrderBy('i.invoiceNumber', 'DESC')
      .skip(skip)
      .take(limit);
    if (options?.status)
      qb.andWhere('i.status = :status', { status: options.status });
    const [entities, total] = await qb.getManyAndCount();

    return { data: entities.map((e) => this.toDomain(e)), total };
  }

  async findAll(options?: {
    status?: string;
    contractId?: string;
    page?: number;
    limit?: number;
  }): Promise<FindResult<ContractTestInvoice>> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.contractId) where.contractId = options.contractId;

    const [entities, total] = await this.repository.findAndCount({
      where: { ...where, deletedAt: IsNull() } as any,
      take: limit,
      skip,
      order: { billingPeriodEnd: 'DESC' as any },
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

  async getLastInvoiceNumber(): Promise<string | null> {
    const entity = await this.repository.findOne({
      where: { deletedAt: IsNull() } as any,
      order: { invoiceNumber: 'DESC' as any },
      select: ['invoiceNumber'] as any,
    });
    return entity?.invoiceNumber ?? null;
  }

  async sumInitialFeeApplied(contractId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.initial_fee_applied), 0)', 'total')
      .where('i.contract_id = :contractId', { contractId })
      .andWhere("i.status <> 'cancelled'")
      .andWhere('i.deleted_at IS NULL')
      .getRawOne();
    return Number(result?.total ?? 0);
  }

  // ─── Write helpers ──────────────────────────────────────────────────────

  async save(invoice: ContractTestInvoice): Promise<ContractTestInvoice> {
    // Persist header + line items in a transaction so the per-result rows
    // can never end up half-written relative to the invoice header.
    return this.dataSource.transaction(async (manager) => {
      const headerRepo = manager.getRepository(
        ContractTestInvoiceTypeOrmEntity,
      );
      const lineRepo = manager.getRepository(
        ContractTestInvoiceResultTypeOrmEntity,
      );

      const entity = this.toEntity(invoice);
      const savedHeader = await headerRepo.save(entity);
      const headerId = (savedHeader as any).id as string;

      if (invoice.lines && invoice.lines.length > 0) {
        // If we already have line rows for this invoice (update path),
        // wipe them and re-insert so we don't accumulate orphans.
        await lineRepo.delete({ invoiceId: headerId } as any);
        const rows = invoice.lines.map(
          (l) =>
            manager.create(ContractTestInvoiceResultTypeOrmEntity, {
              invoiceId: headerId,
              testResultId: l.testResultId,
              serviceName: l.serviceName ?? null,
              sampleCode: l.sampleCode ?? null,
              unitPrice: l.unitPrice ?? 0,
              quantity: l.quantity ?? 1,
              totalPrice: l.totalPrice ?? 0,
            }) as any,
        );
        await lineRepo.save(rows);
      }

      const reloaded = await headerRepo.findOne({
        where: { id: headerId } as any,
      });
      return this.toDomain(reloaded!);
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
