import { Injectable } from '@nestjs/common';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { APInvoiceTypeOrmEntity } from '../entities/ap-invoice-typeorm.entity';
import { APInvoiceRepositoryPort } from '../../domain/repositories/finance-repository.port';

@Injectable()
export class APInvoiceTypeOrmRepository implements APInvoiceRepositoryPort {
  private readonly repo: Repository<APInvoiceTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(APInvoiceTypeOrmEntity);
  }

  async findAll(filters?: {
    vendorId?: string;
    status?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: APInvoiceTypeOrmEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ap');
    qb.where('ap.deleted_at IS NULL');

    if (filters?.vendorId) {
      qb.andWhere('ap.vendorId = :vendorId', { vendorId: filters.vendorId });
    }
    if (filters?.status) {
      qb.andWhere('ap.status = :status', { status: filters.status });
    }
    if (filters?.dueDateFrom) {
      qb.andWhere('ap.dueDate >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }
    if (filters?.dueDateTo) {
      qb.andWhere('ap.dueDate <= :dueDateTo', { dueDateTo: filters.dueDateTo });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('ap.dueDate', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [entities, total] = await qb.getManyAndCount();
    return { data: entities, total };
  }

  async findById(id: string): Promise<APInvoiceTypeOrmEntity | null> {
    return this.repo.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
  }

  async save(entity: any): Promise<APInvoiceTypeOrmEntity> {
    return this.repo.save(entity) as Promise<APInvoiceTypeOrmEntity>;
  }

  create(data: any): APInvoiceTypeOrmEntity {
    return this.repo.create(data as Partial<APInvoiceTypeOrmEntity>);
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AP-${year}-`;
    const last = await this.repo
      .createQueryBuilder('ap')
      .where('ap.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ap.invoiceNumber', 'DESC')
      .getOne();

    if (!last) return `${prefix}0001`;
    const seq = parseInt(last.invoiceNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findByIds(ids: string[]): Promise<APInvoiceTypeOrmEntity[]> {
    return this.repo.find({ where: { id: In(ids) } });
  }
}
