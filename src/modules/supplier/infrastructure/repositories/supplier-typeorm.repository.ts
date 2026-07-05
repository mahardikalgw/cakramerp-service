import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SupplierTypeOrmEntity } from '../entities/supplier-typeorm.entity';
import type { SupplierRepositoryPort } from '../../domain/repositories/supplier-repository.port';

@Injectable()
export class SupplierTypeOrmRepository implements SupplierRepositoryPort {
  private readonly repo: Repository<SupplierTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(SupplierTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SupplierTypeOrmEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder('s');

    if (filters?.search) {
      qb.andWhere(
        '(s.name ILIKE :search OR s.email ILIKE :search OR s.phone ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    if (filters?.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('s.name', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<SupplierTypeOrmEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<SupplierTypeOrmEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async save(entity: SupplierTypeOrmEntity): Promise<SupplierTypeOrmEntity> {
    return this.repo.save(entity);
  }

  create(data: Partial<SupplierTypeOrmEntity>): SupplierTypeOrmEntity {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
