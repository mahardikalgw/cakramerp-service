import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { envConfig } from '../../../../config/env.config';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';
import {
  DocumentGenerationService,
  GenerateDocumentInput,
} from './application/document-generation.service';

/**
 * Backwards-compatible facade used by every feature module. The public method
 * signatures are unchanged from the previous REST-client implementation; only
 * the transport (now in-process rendering, optionally queued) differs.
 */
@Injectable()
export class DocumentGenerationHelper {
  private readonly logger = new Logger(DocumentGenerationHelper.name);

  constructor(
    private readonly service: DocumentGenerationService,
    @InjectRepository(GeneratedDocumentTypeOrmEntity)
    private readonly docRepo: Repository<GeneratedDocumentTypeOrmEntity>,
  ) {}

  async generateDocument(request: {
    documentType: string;
    entityId: string;
    requestedBy?: string;
    outputFormat?: string;
    parameters?: Record<string, any>;
    lines?: Record<string, any>[];
    watermark?: string;
  }): Promise<GeneratedDocumentTypeOrmEntity> {
    return this.service.generateSync({
      documentType: request.documentType,
      entityId: request.entityId,
      requestedBy: request.requestedBy,
      outputFormat: request.outputFormat,
      parameters: request.parameters,
      lines: request.lines,
      watermark: request.watermark,
    });
  }

  /**
   * Fire-and-forget generation. Creates a `pending` record and enqueues the
   * render job; failures are persisted as `failed` rows (FR-006 / Q4=A).
   */
  async generateAsync(request: {
    requestId?: string;
    documentType: string;
    entityId?: string;
    tenantId?: string;
    requestedBy?: string;
    outputFormat?: string;
    parameters?: Record<string, any>;
    lines?: Record<string, any>[];
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

    const input: GenerateDocumentInput = {
      documentType: request.documentType,
      entityId: request.entityId ?? '',
      requestedBy: request.requestedBy,
      outputFormat: request.outputFormat || 'pdf',
      parameters: params,
      lines: request.lines ?? [],
      watermark: request.watermark,
    };

    try {
      return await this.service.generateQueued(input);
    } catch (err: any) {
      this.logger.warn(`Document generation skipped: ${err?.message ?? err}`);
      return {} as GeneratedDocumentTypeOrmEntity;
    }
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
    const baseUrl = (envConfig.apiUrl || '').replace(/\/$/, '');
    return `${baseUrl}/documents/${doc.id}/download`;
  }
}
