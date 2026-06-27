import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { PostApprovalTestingSchedule } from '../../domain/entities/post-approval-testing-schedule.entity';
import { TestingScheduleTypeOrmEntity } from '../entities/testing-schedule-typeorm.entity';
import { PostApprovalTestingScheduleRepositoryPort } from '../../domain/repositories/post-approval-testing-schedule-repository.port';

@Injectable()
export class PostApprovalTestingScheduleTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    PostApprovalTestingSchedule,
    TestingScheduleTypeOrmEntity
  >
  implements PostApprovalTestingScheduleRepositoryPort
{
  protected readonly repository: Repository<TestingScheduleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingScheduleTypeOrmEntity);
  }

  toDomain(entity: TestingScheduleTypeOrmEntity): PostApprovalTestingSchedule {
    return new PostApprovalTestingSchedule({
      id: entity.id,
      contractId: entity.contractId ?? '',
      createdBy: entity.createdBy ?? '',
      createdByName: entity.createdByName ?? '',
      scheduledDate: entity.scheduledDate ?? '',
      scheduledTime: entity.scheduledTime,
      scheduledLocation: entity.scheduledLocation,
      qtySamples: entity.qtySamples ?? 0,
      notes: entity.notes,
      laboranId: entity.laboranId,
      laboranName: entity.laboranName,
      status: (entity.status ??
        'pending') as PostApprovalTestingSchedule['status'],
      confirmedBy: entity.confirmedBy,
      confirmedByName: entity.confirmedByName,
      confirmedAt: entity.confirmedAt,
      statusNotes: entity.statusNotes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PostApprovalTestingSchedule): TestingScheduleTypeOrmEntity {
    const entity = new TestingScheduleTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.contractId = domain.contractId;
    entity.createdBy = domain.createdBy;
    entity.createdByName = domain.createdByName;
    entity.scheduleDate = new Date(domain.scheduledDate);
    entity.timeSlot = domain.scheduledTime ?? '';
    entity.scheduledDate = domain.scheduledDate;
    entity.scheduledTime = domain.scheduledTime ?? null;
    entity.scheduledLocation = domain.scheduledLocation ?? null;
    entity.qtySamples = domain.qtySamples ?? 0;
    entity.notes = domain.notes ?? null;
    entity.laboranId = domain.laboranId ?? null;
    entity.laboranName = domain.laboranName ?? null;
    entity.status = domain.status ?? 'pending';
    entity.confirmedBy = domain.confirmedBy ?? null;
    entity.confirmedByName = domain.confirmedByName ?? null;
    entity.confirmedAt = domain.confirmedAt ?? null;
    entity.statusNotes = domain.statusNotes ?? null;
    return entity;
  }

  async findByContractId(
    contractId: string,
  ): Promise<PostApprovalTestingSchedule[]> {
    const entities = await this.repository.find({ where: { contractId } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByLaboranId(
    laboranId: string,
  ): Promise<PostApprovalTestingSchedule[]> {
    const entities = await this.repository.find({ where: { laboranId } });
    return entities.map((e) => this.toDomain(e));
  }
}
