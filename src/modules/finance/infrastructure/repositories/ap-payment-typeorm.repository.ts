import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { APPaymentTypeOrmEntity } from '../entities/ap-payment-typeorm.entity';
import { APPayment } from '../../domain/entities/ap-payment.entity';
import { APPaymentRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Decimal } from 'decimal.js';

@Injectable()
export class APPaymentTypeOrmRepository implements APPaymentRepositoryPort {
  private readonly repo: Repository<APPaymentTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(APPaymentTypeOrmEntity);
  }

  async findById(id: string): Promise<APPayment | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<FindResult<APPayment>> {
    const [entities, total] = await this.repo.findAndCount({
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
      order: { scheduledDate: 'ASC' },
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

  async findOutstanding(): Promise<APPayment[]> {
    const entities = await this.repo.find({
      where: [{ status: 'scheduled' }, { status: 'overdue' }],
      order: { scheduledDate: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByDateRange(start: Date): Promise<APPayment[]> {
    const entities = await this.repo.find({
      where: { scheduledDate: start },
      order: { scheduledDate: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(entity: APPayment): Promise<APPayment> {
    const saved = await this.repo.save(this.toEntity(entity));
    return this.toDomain(saved);
  }

  async saveMany(entities: APPayment[]): Promise<APPayment[]> {
    const saved = await this.repo.save(entities.map((e) => this.toEntity(e)));
    return saved.map((e) => this.toDomain(e));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repo.count({ where: { id } });
    return count > 0;
  }

  private toDomain(entity: APPaymentTypeOrmEntity): APPayment {
    return new APPayment({
      id: entity.id,
      vendorId: entity.vendorId,
      vendorName: entity.vendorName,
      amount: new Decimal(entity.amount),
      scheduledDate: entity.scheduledDate,
      paidDate: entity.paidDate ?? undefined,
      status: entity.status as any,
      category: entity.category,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(domain: APPayment): APPaymentTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      vendorId: domain.vendorId,
      vendorName: domain.vendorName,
      amount: domain.amount.toNumber(),
      scheduledDate: domain.scheduledDate,
      paidDate: domain.paidDate,
      status: domain.status,
      category: domain.category,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    });
  }
}
