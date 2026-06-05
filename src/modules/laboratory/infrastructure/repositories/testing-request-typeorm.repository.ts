import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  TestingRequest,
  TestingRequestLine,
} from '../../domain/entities/testing-request.entity';
import { TestingRequestTypeOrmEntity } from '../entities/testing-request-typeorm.entity';
import { TestingRequestLineTypeOrmEntity } from '../entities/testing-request-line-typeorm.entity';
import { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';

@Injectable()
export class TestingRequestTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    TestingRequest,
    TestingRequestTypeOrmEntity
  >
  implements TestingRequestRepositoryPort
{
  protected readonly repository: Repository<TestingRequestTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingRequestTypeOrmEntity);
  }

  toDomain(entity: TestingRequestTypeOrmEntity): TestingRequest {
    return new TestingRequest({
      id: entity.id,
      requestNumber: entity.requestNumber,
      customerId: entity.customerId,
      projectName: entity.projectName,
      projectLocation: entity.projectLocation,
      testingType: entity.testingType,
      sampleQuantity: entity.sampleQuantity,
      scheduleDate: entity.scheduleDate,
      notes: entity.notes,
      status: entity.status as TestingRequest['status'],
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      rejectionReason: entity.rejectionReason,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new TestingRequestLine({
                id: line.id,
                testingRequestId: line.testingRequestId,
                testingServiceId: line.testingServiceId,
                serviceName: line.serviceName,
                sampleQuantity: line.sampleQuantity,
                notes: line.notes,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestingRequest): TestingRequestTypeOrmEntity {
    const entity = new TestingRequestTypeOrmEntity();
    entity.id = domain.id;
    entity.requestNumber = domain.requestNumber;
    entity.customerId = domain.customerId ?? '';
    entity.projectName = domain.projectName ?? '';
    entity.projectLocation = domain.projectLocation ?? '';
    entity.testingType = domain.testingType ?? '';
    entity.sampleQuantity = domain.sampleQuantity ?? 0;
    entity.scheduleDate = domain.scheduleDate
      ? new Date(domain.scheduleDate)
      : new Date();
    entity.notes = domain.notes ?? '';
    entity.status = domain.status ?? 'draft';
    entity.createdBy = domain.createdBy ?? '';
    entity.approvedBy = domain.approvedBy ?? '';
    entity.approvedAt = domain.approvedAt
      ? domain.approvedAt instanceof Date
        ? domain.approvedAt
        : new Date(domain.approvedAt)
      : undefined;
    entity.rejectionReason = domain.rejectionReason ?? '';
    entity.lines =
      domain.lines?.map((line) => {
        const lineEntity = new TestingRequestLineTypeOrmEntity();
        lineEntity.id = line.id;
        lineEntity.testingRequestId = line.testingRequestId ?? '';
        lineEntity.testingServiceId = line.testingServiceId;
        lineEntity.serviceName = line.serviceName;
        lineEntity.sampleQuantity = line.sampleQuantity;
        lineEntity.notes = line.notes ?? '';
        return lineEntity;
      }) ?? [];
    return entity;
  }

  async findByRequestNumber(
    requestNumber: string,
  ): Promise<TestingRequest | null> {
    const entity = await this.repository.findOne({
      where: { requestNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastRequestNumber(): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('tr')
      .select('tr.request_number', 'requestNumber')
      .orderBy('tr.request_number', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.requestNumber ?? null;
  }
}
