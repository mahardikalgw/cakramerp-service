import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssetRepositoryPort } from '../../domain/repositories/asset-repository.port';
import { AssetTypeOrmEntity } from '../entities/asset-typeorm.entity';
import { AssetDepreciationTypeOrmEntity } from '../entities/asset-depreciation-typeorm.entity';

@Injectable()
export class AssetTypeOrmRepository implements AssetRepositoryPort {
  private readonly assetRepo: Repository<AssetTypeOrmEntity>;
  private readonly depreciationRepo: Repository<AssetDepreciationTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.assetRepo = dataSource.getRepository(AssetTypeOrmEntity);
    this.depreciationRepo = dataSource.getRepository(
      AssetDepreciationTypeOrmEntity,
    );
  }

  async findAll(filters?: {
    search?: string;
    category?: string;
    status?: string;
    depreciationMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.assetRepo.createQueryBuilder('asset');

    if (filters?.search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.assetNumber ILIKE :search OR asset.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters?.category) {
      qb.andWhere('asset.category = :category', { category: filters.category });
    }
    if (filters?.status) {
      qb.andWhere('asset.status = :status', { status: filters.status });
    }
    if (filters?.depreciationMethod) {
      qb.andWhere('asset.depreciationMethod = :method', {
        method: filters.depreciationMethod,
      });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('asset.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<any | null> {
    return this.assetRepo.findOne({ where: { id } });
  }

  async create(data: any): Promise<any> {
    const entity = this.assetRepo.create(data);
    return this.assetRepo.save(entity);
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.assetRepo.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, data);
    return this.assetRepo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.assetRepo.softDelete(id);
  }

  async getLastAssetNumber(prefix: string): Promise<string | null> {
    const last = await this.assetRepo
      .createQueryBuilder('asset')
      .where('asset.assetNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('asset.assetNumber', 'DESC')
      .getOne();
    return last?.assetNumber ?? null;
  }

  async getDepreciationHistory(assetId: string): Promise<any[]> {
    return this.depreciationRepo.find({
      where: { assetId },
      order: { periodDate: 'DESC' },
    });
  }

  async createDepreciation(data: any): Promise<any> {
    const entity = this.depreciationRepo.create(data);
    return this.depreciationRepo.save(entity);
  }

  async findAssetsDueForDepreciation(
    schedule: string,
    beforeDate: Date,
  ): Promise<any[]> {
    const qb = this.assetRepo.createQueryBuilder('asset');
    qb.where('asset.status = :status', { status: 'active' });
    qb.andWhere('asset.depreciationSchedule = :schedule', { schedule });
    qb.andWhere(
      '(asset.lastDepreciationDate IS NULL OR asset.lastDepreciationDate < :beforeDate)',
      { beforeDate },
    );
    qb.andWhere('asset.currentBookValue > asset.salvageValue');
    return qb.getMany();
  }
}
