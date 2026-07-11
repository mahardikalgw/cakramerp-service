import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import {
  TestResult,
  TestResultAttachment,
} from '../../domain/entities/test-result.entity';
import { TestResultTypeOrmEntity } from '../entities/test-result-typeorm.entity';
import { TestResultAttachmentTypeOrmEntity } from '../entities/test-result-attachment-typeorm.entity';
import { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import {
  SequenceGenerator,
  ADVISORY_LOCK_KEYS,
} from '../../../../shared/kernel/infrastructure/database/sequence-generator';

@Injectable()
export class TestResultTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    TestResult,
    TestResultTypeOrmEntity
  >
  implements TestResultRepositoryPort
{
  protected readonly repository: Repository<TestResultTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestResultTypeOrmEntity);
  }

  toDomain(entity: TestResultTypeOrmEntity): TestResult {
    return new TestResult({
      id: entity.id,
      resultNumber: entity.resultNumber,
      sampleId: entity.sampleId,
      sampleCode: entity.sampleCode,
      testingServiceId: entity.testingServiceId,
      serviceName: entity.serviceName,
      testingRequestId: entity.testingRequestId,
      parameter: entity.parameter,
      resultValue: entity.resultValue,
      unit: entity.unit,
      laboratoryNotes: entity.laboratoryNotes,
      testedById: entity.testedById,
      testedByName: entity.testedByName,
      testedAt: entity.testedAt,
      approvedById: entity.approvedById,
      approvedAt: entity.approvedAt,
      status: entity.status as TestResult['status'],
      contractId: entity.contractId,
      contractSampleId: entity.contractSampleId,
      scheduleId: entity.scheduleId,
      attachments: Array.isArray(entity.attachments)
        ? entity.attachments.map(
            (a) =>
              new TestResultAttachment({
                id: a.id,
                testResultId: a.testResultId,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                fileType: a.fileType,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestResult): TestResultTypeOrmEntity {
    const entity = new TestResultTypeOrmEntity();
    entity.id = domain.id;
    entity.resultNumber = domain.resultNumber;
    entity.sampleId = domain.sampleId;
    entity.sampleCode = domain.sampleCode;
    entity.testingServiceId = domain.testingServiceId;
    entity.serviceName = domain.serviceName;
    entity.testingRequestId = domain.testingRequestId || (null as any);
    entity.parameter = domain.parameter;
    entity.resultValue = domain.resultValue;
    entity.unit = domain.unit ?? '';
    entity.laboratoryNotes = domain.laboratoryNotes ?? '';
    entity.testedById = domain.testedById || (null as any);
    entity.testedByName = domain.testedByName ?? '';
    entity.testedAt = domain.testedAt as any;
    entity.approvedById = domain.approvedById || (null as any);
    entity.approvedAt = domain.approvedAt as any;
    entity.status = domain.status ?? 'draft';
    entity.attachments =
      domain.attachments?.map((a) => {
        const attEntity = new TestResultAttachmentTypeOrmEntity();
        attEntity.id = a.id;
        attEntity.testResultId = a.testResultId;
        attEntity.fileName = a.fileName;
        attEntity.fileUrl = a.fileUrl;
        attEntity.fileType = a.fileType ?? '';
        return attEntity;
      }) ?? [];
    return entity;
  }

  async findByResultNumber(resultNumber: string): Promise<TestResult | null> {
    const entity = await this.repository.findOne({
      where: { resultNumber, deletedAt: IsNull() },
      relations: ['attachments'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastResultNumber(): Promise<string | null> {
    // Kept for backward compatibility. The new
    // generateNextResultNumber() should be used for create flow.
    const row = await this.repository
      .createQueryBuilder('tr')
      .select('tr.result_number', 'resultNumber')
      .orderBy(
        "CAST(SUBSTRING(tr.result_number FROM 'RES-\\d{4}-(\\d+)') AS INTEGER)",
        'DESC',
      )
      .limit(1)
      .getRawOne();
    return row?.resultNumber ?? null;
  }

  /**
   * Atomically generates the next result_number using a PostgreSQL
   * advisory lock + numeric sort. Replaces the old buggy
   * implementation that sorted strings lexicographically and
   * filtered `deleted_at IS NULL` — both caused duplicate-key
   * violations on test-result creation. See sequence-generator.ts
   * for the full rationale.
   */
  async generateNextResultNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = new SequenceGenerator(this.dataSource, {
      prefix: `RES-${year}-`,
      padLength: 5,
      lockKey: ADVISORY_LOCK_KEYS.TEST_RESULT,
    });
    return seq.next('result_number', 'test_results');
  }

  async findBySampleId(sampleId: string): Promise<TestResult[]> {
    const entities = await this.repository.find({
      where: { sampleId, deletedAt: IsNull() } as any,
      relations: ['attachments'],
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByTestingRequestId(
    testingRequestId: string,
  ): Promise<TestResult[]> {
    const entities = await this.repository.find({
      where: { testingRequestId, deletedAt: IsNull() } as any,
      relations: ['attachments'],
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByContractId(contractId: string): Promise<TestResult[]> {
    const entities = await this.repository.find({
      where: { contractId, deletedAt: IsNull() } as any,
      relations: ['attachments'],
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findCompletedByContractAndPeriod(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TestResult[]> {
    const entities = await this.repository
      .createQueryBuilder('r')
      .where('r.contract_id = :contractId', { contractId })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.status = :status', { status: 'confirmed' })
      .andWhere('r.confirmed_at >= :start', { start: periodStart })
      .andWhere('r.confirmed_at < :end', { end: periodEnd })
      .getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
