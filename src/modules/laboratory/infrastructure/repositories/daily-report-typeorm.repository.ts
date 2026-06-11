import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  DailyReport,
  DailyReportLine,
} from '../../domain/entities/daily-report.entity';
import { DailyReportTypeOrmEntity } from '../entities/daily-report-typeorm.entity';
import { DailyReportLineTypeOrmEntity } from '../entities/daily-report-line-typeorm.entity';
import { DailyReportRepositoryPort } from '../../domain/repositories/daily-report-repository.port';

@Injectable()
export class DailyReportTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<DailyReport, DailyReportTypeOrmEntity>
  implements DailyReportRepositoryPort
{
  protected readonly repository: Repository<DailyReportTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(DailyReportTypeOrmEntity);
  }

  toDomain(entity: DailyReportTypeOrmEntity): DailyReport {
    return new DailyReport({
      id: entity.id,
      reportNumber: entity.reportNumber,
      reportDate: entity.reportDate,
      testingRequestId: entity.testingRequestId,
      testingRequestNumber: entity.testingRequestNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      status: entity.status as DailyReport['status'],
      submittedAt: entity.submittedAt,
      approvedById: entity.approvedById,
      approvedAt: entity.approvedAt,
      rejectionReason: entity.rejectionReason,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new DailyReportLine({
                id: line.id,
                dailyReportId: line.dailyReportId,
                testResultId: line.testResultId,
                resultNumber: line.resultNumber,
                sampleCode: line.sampleCode,
                serviceName: line.serviceName,
                parameter: line.parameter,
                resultValue: line.resultValue,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: DailyReport): DailyReportTypeOrmEntity {
    const entity = new DailyReportTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.reportNumber = domain.reportNumber;
    entity.reportDate =
      domain.reportDate instanceof Date
        ? domain.reportDate
        : new Date(domain.reportDate);
    entity.testingRequestId = domain.testingRequestId;
    entity.testingRequestNumber = domain.testingRequestNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.status = domain.status ?? 'draft';
    entity.submittedAt = domain.submittedAt as any;
    entity.approvedById = domain.approvedById || (null as any);
    entity.approvedAt = domain.approvedAt as any;
    entity.rejectionReason = domain.rejectionReason ?? '';
    entity.lines =
      domain.lines?.map((line) => {
        const lineEntity = new DailyReportLineTypeOrmEntity();
        if (line.id) lineEntity.id = line.id;
        if (line.dailyReportId) lineEntity.dailyReportId = line.dailyReportId;
        lineEntity.testResultId = line.testResultId;
        lineEntity.resultNumber = line.resultNumber;
        lineEntity.sampleCode = line.sampleCode;
        lineEntity.serviceName = line.serviceName;
        lineEntity.parameter = line.parameter;
        lineEntity.resultValue = line.resultValue;
        return lineEntity;
      }) ?? [];
    return entity;
  }

  async findByReportNumber(reportNumber: string): Promise<DailyReport | null> {
    const entity = await this.repository.findOne({
      where: { reportNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastReportNumber(): Promise<string | null> {
    const row = await this.repository
      .createQueryBuilder('dr')
      .select('dr.report_number', 'reportNumber')
      .orderBy('dr.report_number', 'DESC')
      .limit(1)
      .getRawOne();
    return row?.reportNumber ?? null;
  }

  async findByTestingRequestId(
    testingRequestId: string,
  ): Promise<DailyReport[]> {
    const entities = await this.repository.find({
      where: { testingRequestId } as any,
      relations: ['lines'],
    });
    return entities.map((e) => this.toDomain(e));
  }
}
