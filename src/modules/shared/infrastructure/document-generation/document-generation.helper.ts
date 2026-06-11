import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentGenerationRestClient } from './document-generation-rest-client.service';
import { MinioClientService } from './minio-client.service';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';

@Injectable()
export class DocumentGenerationHelper {
  private readonly logger = new Logger(DocumentGenerationHelper.name);

  constructor(
    private readonly restClient: DocumentGenerationRestClient,
    private readonly minioClient: MinioClientService,
    @InjectRepository(GeneratedDocumentTypeOrmEntity)
    private readonly docRepo: Repository<GeneratedDocumentTypeOrmEntity>,
  ) {}

  async generateDocument(request: {
    documentType: string;
    entityId?: string;
    requestedBy?: string;
    outputFormat?: string;
    parameters?: Record<string, any>;
    lines?: Record<string, any>[];
  }): Promise<GeneratedDocumentTypeOrmEntity> {
    const result = await this.restClient.generateSync(request);

    // requested_by must be a valid UUID (NOT NULL constraint)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const requestedBy = uuidPattern.test(request.requestedBy ?? '')
      ? request.requestedBy
      : '00000000-0000-0000-0000-000000000000';

    const partial: Partial<GeneratedDocumentTypeOrmEntity> = {
      documentType: request.documentType,
      entityId: request.entityId,
      minioPath: result.minioPath || '',
      minioBucket: result.minioBucket || '',
      fileName: result.fileName || '',
      fileSize: result.fileSize || 0,
      contentType: result.contentType || 'application/pdf',
      status: 'completed',
      outputFormat: request.outputFormat || 'pdf',
      parameters: request.parameters || {},
      requestedBy: requestedBy as any,
      requestedAt: new Date(),
      completedAt: new Date(),
    };
    const entity = this.docRepo.create(partial as any);
    const saved = (await this.docRepo.save(entity)) as unknown as GeneratedDocumentTypeOrmEntity;
    this.logger.log(`Document record saved: ${saved.id} (${request.documentType})`);
    return saved;
  }

  /**
   * Backward-compatible wrapper that converts old-style async request
   * to new sync REST call.
   */
  async generateAsync(request: {
    requestId?: string;
    documentType: string;
    entityId?: string;
    tenantId?: string;
    requestedBy?: string;
    outputFormat?: string;
    parameters?: Record<string, any>;
    watermark?: string;
  }): Promise<GeneratedDocumentTypeOrmEntity> {
    const params: Record<string, any> = {
      ...(request.parameters || {}),
      tenantId: request.tenantId,
      requestedBy: request.requestedBy,
    };
    if (request.entityId) {
      params.entityId = request.entityId;
    }

    const result = await this.restClient.generateSync({
      documentType: request.documentType,
      entityId: request.entityId,
      outputFormat: request.outputFormat || 'pdf',
      watermark: request.watermark,
      parameters: params,
    });

    const partial: Partial<GeneratedDocumentTypeOrmEntity> = {
      documentType: request.documentType,
      minioPath: result.minioPath || '',
      minioBucket: result.minioBucket || '',
      fileName: result.fileName || '',
      fileSize: result.fileSize || 0,
      contentType: result.contentType || 'application/pdf',
      status: 'completed',
      outputFormat: request.outputFormat || 'pdf',
      parameters: params,
      completedAt: new Date(),
    };
    const entity = this.docRepo.create(partial as any);
    return this.docRepo.save(entity).then((r) => r as unknown as GeneratedDocumentTypeOrmEntity);
  }

  async getDocument(
    documentId: string,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    const doc = await this.docRepo.findOne({
      where: { id: documentId } as any,
    });
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return doc;
  }

  async getDocumentsByEntity(
    documentType: string,
    entityId: string,
  ): Promise<GeneratedDocumentTypeOrmEntity[]> {
    return this.docRepo.find({
      where: { documentType, entityId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async getLatestDocument(
    documentType: string,
    entityId: string,
  ): Promise<GeneratedDocumentTypeOrmEntity | null> {
    return this.docRepo.findOne({
      where: { documentType, entityId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async getDownloadUrl(documentId: string): Promise<string> {
    const doc = await this.getDocument(documentId);
    return this.minioClient.getPresignedUrl(
      doc.minioBucket,
      doc.minioPath.replace(`${doc.minioBucket}/`, ''),
    );
  }
}
