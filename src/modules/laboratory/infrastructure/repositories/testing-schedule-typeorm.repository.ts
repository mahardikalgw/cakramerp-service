import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { TestingSchedule } from '../../domain/entities/testing-schedule.entity';
import { TestingScheduleTypeOrmEntity } from '../entities/testing-schedule-typeorm.entity';
import { TestingScheduleRepositoryPort } from '../../domain/repositories/testing-schedule-repository.port';

@Injectable()
export class TestingScheduleTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    TestingSchedule,
    TestingScheduleTypeOrmEntity
  >
  implements TestingScheduleRepositoryPort
{
  protected readonly repository: Repository<TestingScheduleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingScheduleTypeOrmEntity);
  }

  toDomain(entity: TestingScheduleTypeOrmEntity): TestingSchedule {
    return new TestingSchedule({
      id: entity.id,
      scheduleDate: entity.scheduleDate,
      timeSlot: entity.timeSlot,
      laboratoryId: entity.laboratoryId,
      laboratoryName: entity.laboratoryName,
      testingRequestId: entity.testingRequestId,
      testingRequestNumber: entity.testingRequestNumber,
      sampleId: entity.sampleId,
      sampleCode: entity.sampleCode,
      technicianId: entity.technicianId,
      technicianName: entity.technicianName,
      notes: entity.notes,
      status: entity.status as TestingSchedule['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestingSchedule): TestingScheduleTypeOrmEntity {
    const entity = new TestingScheduleTypeOrmEntity();
    entity.id = domain.id;
    entity.scheduleDate =
      domain.scheduleDate instanceof Date
        ? domain.scheduleDate
        : new Date(domain.scheduleDate);
    entity.timeSlot = domain.timeSlot;
    entity.laboratoryId = domain.laboratoryId;
    entity.laboratoryName = domain.laboratoryName;
    entity.testingRequestId = domain.testingRequestId ?? null;
    entity.testingRequestNumber = domain.testingRequestNumber ?? null;
    entity.sampleId = domain.sampleId ?? null;
    entity.sampleCode = domain.sampleCode ?? null;
    entity.technicianId = domain.technicianId ?? null;
    entity.technicianName = domain.technicianName ?? null;
    entity.notes = domain.notes ?? null;
    entity.status = domain.status ?? 'scheduled';
    return entity;
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<TestingSchedule[]> {
    const entities = await this.repository.find({
      where: {
        scheduleDate: Between(new Date(startDate), new Date(endDate)),
      } as any,
      order: { scheduleDate: 'ASC', timeSlot: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByLaboratoryAndDate(
    laboratoryId: string,
    date: string,
  ): Promise<TestingSchedule[]> {
    const entities = await this.repository.find({
      where: {
        laboratoryId,
        scheduleDate: new Date(date),
      } as any,
      order: { timeSlot: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }
}
