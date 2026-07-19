import { Injectable } from '@nestjs/common';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ProjectTypeOrmEntity } from '../entities/project-typeorm.entity';
import { Project } from '../../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Decimal } from 'decimal.js';

@Injectable()
export class ProjectTypeOrmRepository implements ProjectRepositoryPort {
  private readonly repo: Repository<ProjectTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProjectTypeOrmEntity);
  }

  async findById(id: string): Promise<Project | null> {
    const entity = await this.repo.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<FindResult<Project>> {
    const [entities, total] = await this.repo.findAndCount({
      where: { deletedAt: IsNull() } as any,
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
      order: { code: 'ASC' },
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

  async findActive(): Promise<Project[]> {
    const entities = await this.repo.find({
      where: { status: 'active', deletedAt: IsNull() } as any,
      order: { code: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findBySegment(segment: string): Promise<Project[]> {
    const entities = await this.repo.find({
      where: { segment, deletedAt: IsNull() } as any,
      order: { code: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(entity: Project): Promise<Project> {
    const saved = await this.repo.save(this.toEntity(entity));
    return this.toDomain(saved);
  }

  async saveMany(entities: Project[]): Promise<Project[]> {
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

  private toDomain(entity: ProjectTypeOrmEntity): Project {
    return new Project({
      id: entity.id,
      name: entity.name,
      code: entity.code,
      segment: entity.segment,
      status: entity.status as any,
      budget: new Decimal(entity.budget),
      actualCost: new Decimal(entity.actualCost),
      completionPercent: entity.completionPercent,
      startDate: entity.startDate,
      endDate: entity.endDate ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(domain: Project): ProjectTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      name: domain.name,
      code: domain.code,
      segment: domain.segment,
      status: domain.status,
      budget: domain.budget.toNumber(),
      actualCost: domain.actualCost.toNumber(),
      completionPercent: domain.completionPercent,
      startDate: domain.startDate,
      endDate: domain.endDate,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    });
  }
}
