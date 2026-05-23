import { Injectable } from '@nestjs/common'
import { Repository, DataSource, MoreThan, Not } from 'typeorm'
import { KpiAlertTypeOrmEntity } from '../entities/kpi-alert-typeorm.entity'
import { KpiAlert } from '../../domain/entities/kpi-alert.entity'
import { KpiAlertRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class KpiAlertTypeOrmRepository implements KpiAlertRepositoryPort {
  private readonly repo: Repository<KpiAlertTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(KpiAlertTypeOrmEntity)
  }

  async findAll(): Promise<KpiAlert[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } })
    return entities.map(this.toDomain)
  }

  async findUnread(): Promise<KpiAlert[]> {
    const entities = await this.repo.find({ where: { status: 'unread' }, order: { createdAt: 'DESC' } })
    return entities.map(this.toDomain)
  }

  async findByType(type: string, since: Date): Promise<KpiAlert[]> {
    const entities = await this.repo.find({
      where: { type, createdAt: MoreThan(since), status: Not('dismissed') },
      order: { createdAt: 'DESC' },
    })
    return entities.map(this.toDomain)
  }

  async findById(id: string): Promise<KpiAlert | null> {
    const entity = await this.repo.findOne({ where: { id } })
    return entity ? this.toDomain(entity) : null
  }

  async save(entity: KpiAlert): Promise<KpiAlert> {
    const saved = await this.repo.save(this.toEntity(entity))
    return this.toDomain(saved)
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.repo.update(id, { status })
  }

  private toDomain(entity: KpiAlertTypeOrmEntity): KpiAlert {
    return new KpiAlert({
      id: entity.id,
      type: entity.type,
      message: entity.message,
      severity: entity.severity as any,
      status: entity.status as any,
      relatedValue: entity.relatedValue,
      thresholdValue: entity.thresholdValue,
      relatedUrl: entity.relatedUrl ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }

  private toEntity(domain: KpiAlert): KpiAlertTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      type: domain.type,
      message: domain.message,
      severity: domain.severity,
      status: domain.status,
      relatedValue: domain.relatedValue,
      thresholdValue: domain.thresholdValue,
      relatedUrl: domain.relatedUrl,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    })
  }
}
