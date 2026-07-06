import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { ArchivedDocument } from '../../domain/entities/report-distribution.entity';
import { ArchivedDocumentTypeOrmEntity } from '../entities/archived-document-typeorm.entity';
import { ArchivedDocumentRepositoryPort } from '../../domain/repositories/report-distribution-repository.port';

@Injectable()
export class ArchivedDocumentTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    ArchivedDocument,
    ArchivedDocumentTypeOrmEntity
  >
  implements ArchivedDocumentRepositoryPort
{
  protected readonly repository: Repository<ArchivedDocumentTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(ArchivedDocumentTypeOrmEntity);
  }

  toDomain(entity: ArchivedDocumentTypeOrmEntity): ArchivedDocument {
    return new ArchivedDocument({
      id: entity.id,
      documentType: entity.documentType as ArchivedDocument['documentType'],
      entityId: entity.entityId,
      documentNumber: entity.documentNumber,
      minioPath: entity.minioPath,
      minioBucket: entity.minioBucket,
      contentType: entity.contentType,
      fileSize: Number(entity.fileSize ?? 0),
      customerId: entity.customerId,
      customerName: entity.customerName,
      archivedBy: entity.archivedBy,
      archivedAt: entity.archivedAt,
      retentionPeriodDays: entity.retentionPeriodDays,
      expiresAt: entity.expiresAt,
      tags: [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: ArchivedDocument): ArchivedDocumentTypeOrmEntity {
    const entity = new ArchivedDocumentTypeOrmEntity();
    entity.id = domain.id;
    entity.documentType = domain.documentType;
    entity.entityId = domain.entityId;
    entity.documentNumber = domain.documentNumber;
    entity.minioPath = domain.minioPath;
    entity.minioBucket = domain.minioBucket;
    entity.contentType = domain.contentType ?? 'application/pdf';
    entity.fileSize = domain.fileSize ?? 0;
    entity.customerId = domain.customerId || (null as any);
    entity.customerName = domain.customerName ?? '';
    entity.archivedBy = domain.archivedBy ?? '';
    entity.archivedAt = domain.archivedAt ?? new Date();
    entity.retentionPeriodDays = domain.retentionPeriodDays ?? 1825;
    entity.expiresAt = domain.expiresAt ?? new Date('2099-12-31');
    return entity;
  }

  async findByEntityId(
    documentType: string,
    entityId: string,
  ): Promise<ArchivedDocument | null> {
    const entity = await this.repository.findOne({
      where: { documentType, entityId, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCustomerId(customerId: string): Promise<ArchivedDocument[]> {
    const entities = await this.repository.find({
      where: { customerId, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
