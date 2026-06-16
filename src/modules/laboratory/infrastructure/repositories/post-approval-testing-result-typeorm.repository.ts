import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { PostApprovalTestingResult } from '../../domain/entities/post-approval-testing-result.entity';
import { TestResultTypeOrmEntity } from '../entities/test-result-typeorm.entity';
import { PostApprovalTestingResultRepositoryPort } from '../../domain/repositories/post-approval-testing-result-repository.port';

@Injectable()
export class PostApprovalTestingResultTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<PostApprovalTestingResult, TestResultTypeOrmEntity>
  implements PostApprovalTestingResultRepositoryPort
{
  protected readonly repository: Repository<TestResultTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestResultTypeOrmEntity);
  }

  toDomain(entity: TestResultTypeOrmEntity): PostApprovalTestingResult {
    return new PostApprovalTestingResult({
      id: entity.id,
      resultNumber: entity.resultNumber,
      sampleId: entity.sampleId,
      sampleCode: entity.sampleCode,
      testingServiceId: entity.testingServiceId,
      serviceName: entity.serviceName,
      parameter: entity.parameter,
      resultValue: entity.resultValue,
      contractId: entity.contractId ?? '',
      contractSampleId: entity.contractSampleId,
      scheduleId: entity.scheduleId,
      scheduleSampleId: entity.scheduleSampleId,
      sampleUnit: entity.sampleUnit,
      submittedBy: entity.submittedBy ?? '',
      submittedByName: entity.submittedByName ?? '',
      submittedAt: entity.submittedAt ?? new Date(),
      resultData: entity.resultData ?? {},
      resultNotes: entity.resultNotes,
      status: entity.status as PostApprovalTestingResult['status'],
      confirmedBy: entity.confirmedBy,
      confirmedByName: entity.confirmedByName,
      confirmedAt: entity.confirmedAt,
      rejectionReason: entity.rejectionReason,
      certificateDocumentId: entity.certificateDocumentId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PostApprovalTestingResult): TestResultTypeOrmEntity {
    const entity = new TestResultTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    if (domain.resultNumber) entity.resultNumber = domain.resultNumber;
    entity.sampleId = domain.sampleId;
    entity.sampleCode = (domain.sampleCode ?? '-') as any;
    entity.testingServiceId = (domain.testingServiceId ?? '00000000-0000-0000-0000-000000000000') as any;
    entity.serviceName = (domain.serviceName ?? '-') as any;
    entity.parameter = (domain.parameter ?? '-') as any;
    entity.resultValue = (domain.resultValue ?? '-') as any;
    entity.contractId = domain.contractId;
    entity.contractSampleId = (domain.contractSampleId ?? null) as any;
    entity.scheduleId = (domain.scheduleId ?? null) as any;
    entity.scheduleSampleId = (domain.scheduleSampleId ?? null) as any;
    entity.sampleUnit = domain.sampleUnit ?? null;
    entity.submittedBy = domain.submittedBy;
    entity.submittedByName = domain.submittedByName;
    entity.submittedAt = domain.submittedAt ?? new Date();
    entity.resultData = domain.resultData ?? {};
    entity.resultNotes = (domain.resultNotes ?? null) as any;
    entity.status = domain.status;
    entity.confirmedBy = (domain.confirmedBy ?? null) as any;
    entity.confirmedByName = (domain.confirmedByName ?? null) as any;
    entity.confirmedAt = (domain.confirmedAt ?? null) as any;
    entity.rejectionReason = (domain.rejectionReason ?? null) as any;
    entity.certificateDocumentId = (domain.certificateDocumentId ?? null) as any;
    return entity;
  }

  async findBySampleId(sampleId: string): Promise<PostApprovalTestingResult | null> {
    const entity = await this.repository.findOne({ where: { sampleId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByContractId(contractId: string): Promise<PostApprovalTestingResult[]> {
    const entities = await this.repository.find({ where: { contractId } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByScheduleSampleUnit(scheduleSampleId: string, sampleUnit: number): Promise<PostApprovalTestingResult | null> {
    const entity = await this.repository.findOne({ where: { scheduleSampleId, sampleUnit } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByScheduleId(scheduleId: string): Promise<PostApprovalTestingResult[]> {
    const entities = await this.repository.find({ where: { scheduleId } });
    return entities.map((e) => this.toDomain(e));
  }
}