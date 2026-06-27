import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { PostApprovalDocumentArchive } from '../../domain/entities/post-approval-document-archive.entity';
import { PostApprovalDocumentArchiveTypeOrmEntity } from '../entities/post-approval-document-archive-typeorm.entity';
import { PostApprovalDocumentArchiveRepositoryPort } from '../../domain/repositories/post-approval-document-archive-repository.port';

@Injectable()
export class PostApprovalDocumentArchiveTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    PostApprovalDocumentArchive,
    PostApprovalDocumentArchiveTypeOrmEntity
  >
  implements PostApprovalDocumentArchiveRepositoryPort
{
  protected readonly repository: Repository<PostApprovalDocumentArchiveTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(
      PostApprovalDocumentArchiveTypeOrmEntity,
    );
  }

  toDomain(
    entity: PostApprovalDocumentArchiveTypeOrmEntity,
  ): PostApprovalDocumentArchive {
    return new PostApprovalDocumentArchive({
      id: entity.id,
      documentType:
        entity.documentType as PostApprovalDocumentArchive['documentType'],
      testingRequestId: entity.testingRequestId,
      contractId: entity.contractId,
      testingResultId: entity.testingResultId,
      documentNumber: entity.documentNumber,
      minioPath: entity.minioPath,
      signedDocumentUrl: entity.signedDocumentUrl,
      uploadedBy: entity.uploadedBy,
      uploadedByName: entity.uploadedByName,
      uploadedAt: entity.uploadedAt,
      originalFilename: entity.originalFilename,
      status: entity.status as PostApprovalDocumentArchive['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(
    domain: PostApprovalDocumentArchive,
  ): PostApprovalDocumentArchiveTypeOrmEntity {
    const entity = new PostApprovalDocumentArchiveTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.documentType = domain.documentType;
    entity.testingRequestId = domain.testingRequestId ?? '';
    entity.contractId = domain.contractId ?? '';
    entity.testingResultId = domain.testingResultId ?? '';
    entity.documentNumber = domain.documentNumber;
    entity.minioPath = domain.minioPath;
    entity.signedDocumentUrl = domain.signedDocumentUrl ?? '';
    entity.uploadedBy = domain.uploadedBy ?? '';
    entity.uploadedByName = domain.uploadedByName ?? '';
    entity.uploadedAt = domain.uploadedAt as any;
    entity.originalFilename = domain.originalFilename ?? '';
    entity.status = domain.status;
    return entity;
  }

  async findByContractId(
    contractId: string,
  ): Promise<PostApprovalDocumentArchive[]> {
    const entities = await this.repository.find({ where: { contractId } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByTestingResultId(
    testingResultId: string,
  ): Promise<PostApprovalDocumentArchive | null> {
    const entity = await this.repository.findOne({
      where: { testingResultId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByDocumentNumber(
    documentNumber: string,
  ): Promise<PostApprovalDocumentArchive | null> {
    const entity = await this.repository.findOne({ where: { documentNumber } });
    return entity ? this.toDomain(entity) : null;
  }
}
