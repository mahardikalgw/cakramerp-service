import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { PostApprovalDocumentArchive } from '../../domain/entities/post-approval-document-archive.entity';
import { PostApprovalDocumentArchiveTypeOrmEntity } from '../entities/post-approval-document-archive-typeorm.entity';
import { PostApprovalDocumentArchiveRepositoryPort } from '../../domain/repositories/post-approval-document-archive-repository.port';

@Injectable()
export class PostApprovalDocumentArchiveTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
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
    const entities = await this.repository.find({
      where: { contractId, deletedAt: IsNull() },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByTestingResultId(
    testingResultId: string,
  ): Promise<PostApprovalDocumentArchive | null> {
    const entity = await this.repository.findOne({
      where: { testingResultId, deletedAt: IsNull() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByDocumentNumber(
    documentNumber: string,
  ): Promise<PostApprovalDocumentArchive | null> {
    const entity = await this.repository.findOne({
      where: { documentNumber, deletedAt: IsNull() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
