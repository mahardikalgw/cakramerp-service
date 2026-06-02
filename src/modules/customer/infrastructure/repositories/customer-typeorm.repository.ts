import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CustomerTypeOrmEntity } from '../entities/customer-typeorm.entity';
import type { CustomerRepositoryPort } from '../../domain/repositories/customer-repository.port';

@Injectable()
export class CustomerTypeOrmRepository implements CustomerRepositoryPort {
  private readonly repo: Repository<CustomerTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(CustomerTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CustomerTypeOrmEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder('c');

    if (filters?.search) {
      qb.andWhere(
        '(c.name ILIKE :search OR c.email ILIKE :search OR c.phone ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    if (filters?.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('c.name', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<CustomerTypeOrmEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<CustomerTypeOrmEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async save(entity: CustomerTypeOrmEntity): Promise<CustomerTypeOrmEntity> {
    return this.repo.save(entity);
  }

  create(data: Partial<CustomerTypeOrmEntity>): CustomerTypeOrmEntity {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
