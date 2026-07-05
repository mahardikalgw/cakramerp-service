import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ItemTypeOrmEntity } from '../entities/item-typeorm.entity';
import type { ItemRepositoryPort } from '../../domain/repositories/item-repository.port';

@Injectable()
export class ItemTypeOrmRepository implements ItemRepositoryPort {
  private readonly repo: Repository<ItemTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ItemTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ItemTypeOrmEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder('i');

    if (filters?.search) {
      qb.andWhere('(i.name ILIKE :search OR i.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.category) {
      qb.andWhere('i.category = :category', { category: filters.category });
    }

    if (filters?.isActive !== undefined) {
      qb.andWhere('i.isActive = :isActive', { isActive: filters.isActive });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    qb.orderBy('i.name', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<ItemTypeOrmEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<ItemTypeOrmEntity | null> {
    return this.repo.findOne({ where: { code } });
  }

  async save(entity: ItemTypeOrmEntity): Promise<ItemTypeOrmEntity> {
    return this.repo.save(entity);
  }

  create(data: Partial<ItemTypeOrmEntity>): ItemTypeOrmEntity {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
