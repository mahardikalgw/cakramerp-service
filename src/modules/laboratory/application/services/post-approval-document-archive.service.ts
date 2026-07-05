import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PostApprovalDocumentArchive } from '../../domain/entities/post-approval-document-archive.entity';
import type { PostApprovalDocumentArchiveRepositoryPort } from '../../domain/repositories/post-approval-document-archive-repository.port';
import { POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY } from '../../domain/repositories/post-approval-document-archive-repository.port';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';

@Injectable()
export class PostApprovalDocumentArchiveService {
  constructor(
    @Inject(POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY)
    private readonly repository: PostApprovalDocumentArchiveRepositoryPort,
    private readonly minioService: MinioClientService,
    private readonly docHelper: DocumentGenerationHelper,
  ) {}

  async findAll(options?: {
    documentType?: string;
    contractId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.documentType) filters.documentType = options.documentType;
    if (options?.contractId) filters.contractId = options.contractId;
    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<PostApprovalDocumentArchive | null> {
    const archive = await this.repository.findById(id);
    if (!archive) throw new NotFoundException('Document archive not found');
    return archive;
  }

  async uploadSignedDocument(
    testingResultId: string,
    file: any,
    userId: string,
    userName: string,
  ): Promise<PostApprovalDocumentArchive> {
    const existing =
      await this.repository.findByTestingResultId(testingResultId);

    const objectName = `archives/${testingResultId}/${Date.now()}_${file.originalname}`;
    await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );

    if (existing) {
      existing.signedDocumentUrl = objectName;
      existing.uploadedBy = userId;
      existing.uploadedByName = userName;
      existing.uploadedAt = new Date();
      existing.originalFilename = file.originalname;
      existing.status = 'signed';
      return this.repository.save(existing);
    }

    const archive = new PostApprovalDocumentArchive({
      documentType: 'testing_result',
      documentNumber: `DOC-${testingResultId.substring(0, 8)}`,
      minioPath: objectName,
      testingResultId,
      signedDocumentUrl: objectName,
      uploadedBy: userId,
      uploadedByName: userName,
      uploadedAt: new Date(),
      originalFilename: file.originalname,
      status: 'signed',
    });

    return this.repository.save(archive);
  }

  async getDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const archive = await this.repository.findById(id);
    if (!archive) throw new NotFoundException('Document archive not found');
    if (!archive.signedDocumentUrl && !archive.minioPath)
      throw new NotFoundException('No document available');

    // objectName is stored without bucket prefix in this service
    const objectName = archive.signedDocumentUrl || archive.minioPath;
    const url = this.minioService.getPublicDownloadUrl('documents', objectName);
    return {
      url,
      filename: archive.originalFilename || archive.documentNumber + '.pdf',
    };
  }

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const archive = await this.repository.findById(id);
    if (!archive) throw new NotFoundException('Document archive not found');

    const objectName = archive.signedDocumentUrl || archive.minioPath;
    if (objectName) {
      await this.minioService.deleteFile('documents', objectName);
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
