import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { GlPostingQueueTypeOrmEntity } from '../entities/gl-posting-queue-typeorm.entity';
import { GlPostingQueueRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { GlPostingQueue } from '../../domain/entities/gl-posting-queue.entity';

@Injectable()
export class GlPostingQueueTypeOrmRepository implements GlPostingQueueRepositoryPort {
  private readonly repo: Repository<GlPostingQueueTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(GlPostingQueueTypeOrmEntity);
  }

  async findAll(filters?: {
    status?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GlPostingQueue[]; total: number }> {
    const qb = this.repo.createQueryBuilder('pq');

    if (filters?.status) {
      qb.andWhere('pq.status = :status', { status: filters.status });
    }
    if (filters?.sourceType) {
      qb.andWhere('pq.sourceType = :sourceType', {
        sourceType: filters.sourceType,
      });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('pq.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    return { data: entities.map((e) => this.toDomain(e)), total };
  }

  async findById(id: string): Promise<GlPostingQueue | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySource(
    sourceType: string,
    sourceId: string,
  ): Promise<GlPostingQueue | null> {
    const entity = await this.repo.findOne({
      where: { sourceType, sourceId },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(queue: GlPostingQueue): Promise<GlPostingQueue> {
    const entity = this.repo.create({
      ...queue,
      suggestedLines: queue.suggestedLines,
    } as Partial<GlPostingQueueTypeOrmEntity>);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async update(id: string, data: Partial<GlPostingQueue>): Promise<void> {
    await this.repo.update(id, data);
  }

  private toDomain(entity: GlPostingQueueTypeOrmEntity): GlPostingQueue {
    return new GlPostingQueue({
      id: entity.id,
      sourceType: entity.sourceType as any,
      sourceId: entity.sourceId,
      sourceNumber: entity.sourceNumber,
      eventType: entity.eventType as any,
      amount: Number(entity.amount),
      description: entity.description,
      suggestedLines: entity.suggestedLines ?? [],
      status: entity.status as any,
      journalEntryId: entity.journalEntryId ?? undefined,
      postedBy: entity.postedBy ?? undefined,
      postedAt: entity.postedAt ?? undefined,
      customerId: entity.customerId ?? undefined,
      supplierId: entity.supplierId ?? undefined,
      invoiceId: entity.invoiceId ?? undefined,
      billingLetterId: entity.billingLetterId ?? undefined,
      warehouseId: entity.warehouseId ?? undefined,
      spendingId: entity.spendingId ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
