import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LabActivityLogTypeOrmEntity } from '../entities/lab-activity-log-typeorm.entity';
import { LabActivityLog } from '../../domain/entities/lab-activity-log.entity';
import { LabActivityLogRepositoryPort } from '../../domain/repositories/lab-activity-log-repository.port';

@Injectable()
export class LabActivityLogTypeOrmRepository implements LabActivityLogRepositoryPort {
  constructor(
    @InjectRepository(LabActivityLogTypeOrmEntity)
    private readonly repo: Repository<LabActivityLogTypeOrmEntity>,
  ) {}

  async save(log: LabActivityLog): Promise<LabActivityLog> {
    const entity = new LabActivityLogTypeOrmEntity();
    entity.testingRequestId = log.testingRequestId;
    entity.action = log.action;
    entity.performedBy = log.performedBy;
    entity.performedByName = log.performedByName ?? null;
    entity.performedByRole = log.performedByRole ?? null;
    entity.details = log.details ?? null;

    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findByTestingRequest(
    testingRequestId: string,
    options?: { limit?: number },
  ): Promise<LabActivityLog[]> {
    const entities = await this.repo.find({
      where: { testingRequestId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: options?.limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  private toDomain(entity: LabActivityLogTypeOrmEntity): LabActivityLog {
    return new LabActivityLog({
      id: entity.id,
      testingRequestId: entity.testingRequestId,
      action: entity.action,
      performedBy: entity.performedBy,
      performedByName: entity.performedByName ?? undefined,
      performedByRole: entity.performedByRole ?? undefined,
      details: entity.details ?? undefined,
      createdAt: entity.createdAt,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date() });
  }
}
