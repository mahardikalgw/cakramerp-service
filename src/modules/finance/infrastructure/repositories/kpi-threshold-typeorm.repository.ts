import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { KpiThresholdTypeOrmEntity } from '../entities/kpi-threshold-typeorm.entity';
import { KpiThreshold } from '../../domain/entities/kpi-threshold.entity';
import { KpiThresholdRepositoryPort } from '../../domain/repositories/finance-repository.port';

@Injectable()
export class KpiThresholdTypeOrmRepository implements KpiThresholdRepositoryPort {
  private readonly repo: Repository<KpiThresholdTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(KpiThresholdTypeOrmEntity);
  }

  async findAll(): Promise<KpiThreshold[]> {
    const entities = await this.repo.find({ order: { alertType: 'ASC' } });
    return entities.map(this.toDomain);
  }

  async findByType(alertType: string): Promise<KpiThreshold | null> {
    const entity = await this.repo.findOne({ where: { alertType } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(entity: KpiThreshold): Promise<KpiThreshold> {
    const saved = await this.repo.save(this.toEntity(entity));
    return this.toDomain(saved);
  }

  private toDomain(entity: KpiThresholdTypeOrmEntity): KpiThreshold {
    return new KpiThreshold({
      id: entity.id,
      alertType: entity.alertType as any,
      value: entity.value,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(domain: KpiThreshold): KpiThresholdTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      alertType: domain.alertType,
      value: domain.value,
      isActive: domain.isActive,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    });
  }
}
