import { Injectable } from '@nestjs/common';
import { Repository, DataSource, LessThan, Not } from 'typeorm';
import { ARInvoiceTypeOrmEntity } from '../entities/ar-invoice-typeorm.entity';
import { ARInvoice } from '../../domain/entities/ar-invoice.entity';
import { ARInvoiceRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Decimal } from 'decimal.js';

@Injectable()
export class ARInvoiceTypeOrmRepository implements ARInvoiceRepositoryPort {
  private readonly repo: Repository<ARInvoiceTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ARInvoiceTypeOrmEntity);
  }

  async findById(id: string): Promise<ARInvoice | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<FindResult<ARInvoice>> {
    const [entities, total] = await this.repo.findAndCount({
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
      order: { issueDate: 'DESC' },
    });
    return {
      data: entities.map((e) => this.toDomain(e)),
      meta: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (options?.limit ?? 20)),
        hasNextPage: (options?.page ?? 1) * (options?.limit ?? 20) < total,
        hasPrevPage: (options?.page ?? 1) > 1,
      },
    };
  }

  async findOutstanding(): Promise<ARInvoice[]> {
    const entities = await this.repo.find({
      where: { status: Not('paid') },
      order: { dueDate: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByClientId(clientId: string): Promise<ARInvoice[]> {
    const entities = await this.repo.find({
      where: { clientId },
      order: { issueDate: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByDateRange(start: Date, end: Date): Promise<ARInvoice[]> {
    const entities = await this.repo.find({
      where: { issueDate: start, dueDate: LessThan(end) },
      order: { issueDate: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(entity: ARInvoice): Promise<ARInvoice> {
    const saved = await this.repo.save(this.toEntity(entity));
    return this.toDomain(saved);
  }

  async saveMany(entities: ARInvoice[]): Promise<ARInvoice[]> {
    const saved = await this.repo.save(entities.map((e) => this.toEntity(e)));
    return saved.map((e) => this.toDomain(e));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repo.count({ where: { id } });
    return count > 0;
  }

  private toDomain(entity: ARInvoiceTypeOrmEntity): ARInvoice {
    return new ARInvoice({
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      clientId: entity.clientId,
      clientName: entity.clientName,
      projectId: entity.projectId ?? undefined,
      segment: entity.segment ?? undefined,
      amount: new Decimal(entity.amount),
      paidAmount: new Decimal(entity.paidAmount),
      dueDate: new Date(entity.dueDate),
      issueDate: new Date(entity.issueDate),
      status: entity.status as any,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(domain: ARInvoice): ARInvoiceTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      invoiceNumber: domain.invoiceNumber,
      clientId: domain.clientId,
      clientName: domain.clientName,
      projectId: domain.projectId,
      segment: domain.segment,
      amount: domain.amount.toNumber(),
      paidAmount: domain.paidAmount.toNumber(),
      dueDate: domain.dueDate,
      issueDate: domain.issueDate,
      status: domain.status,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    });
  }
}
