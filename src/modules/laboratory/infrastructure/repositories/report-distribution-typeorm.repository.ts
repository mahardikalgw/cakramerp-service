import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { ReportDistribution } from '../../domain/entities/report-distribution.entity';
import { ReportDistributionTypeOrmEntity } from '../entities/report-distribution-typeorm.entity';
import { ReportDistributionRepositoryPort } from '../../domain/repositories/report-distribution-repository.port';

@Injectable()
export class ReportDistributionTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    ReportDistribution,
    ReportDistributionTypeOrmEntity
  >
  implements ReportDistributionRepositoryPort
{
  protected readonly repository: Repository<ReportDistributionTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(ReportDistributionTypeOrmEntity);
  }

  toDomain(entity: ReportDistributionTypeOrmEntity): ReportDistribution {
    return new ReportDistribution({
      id: entity.id,
      documentType: entity.documentType,
      documentId: entity.documentId,
      documentNumber: entity.documentNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      channel: entity.channel as ReportDistribution['channel'],
      recipientEmail: entity.recipientEmail,
      recipientName: entity.recipientName,
      status: entity.status as ReportDistribution['status'],
      sentAt: entity.sentAt,
      deliveredAt: entity.deliveredAt,
      failureReason: entity.failureReason,
      retryCount: entity.retryCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: ReportDistribution): ReportDistributionTypeOrmEntity {
    const entity = new ReportDistributionTypeOrmEntity();
    entity.id = domain.id;
    entity.documentType = domain.documentType;
    entity.documentId = domain.documentId;
    entity.documentNumber = domain.documentNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName ?? '';
    entity.channel = domain.channel;
    entity.recipientEmail = domain.recipientEmail ?? '';
    entity.recipientName = domain.recipientName ?? '';
    entity.status = domain.status ?? 'pending';
    entity.sentAt = domain.sentAt ?? new Date();
    entity.deliveredAt = domain.deliveredAt ?? new Date();
    entity.failureReason = domain.failureReason ?? '';
    entity.retryCount = domain.retryCount ?? 0;
    return entity;
  }

  async findByDocumentId(documentId: string): Promise<ReportDistribution[]> {
    const entities = await this.repository.find({
      where: { documentId } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByCustomerId(customerId: string): Promise<ReportDistribution[]> {
    const entities = await this.repository.find({
      where: { customerId } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }
}
