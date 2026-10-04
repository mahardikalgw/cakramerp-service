import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { GeneratedDocumentTypeOrmEntity } from '../entities/generated-document.entity';
import { DocumentRendererRegistry } from './document-renderer.registry';
import { DocumentStorageService } from '../infrastructure/storage/document-storage.service';
import { DOCUMENT_GENERATION_QUEUE_NAME } from '../../../../../queues/queue.constants';
import type { RenderRequest } from '../domain/document-render.types';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GenerateDocumentInput {
  documentType: string;
  entityId: string;
  requestedBy?: string;
  outputFormat?: string;
  parameters?: Record<string, any>;
  lines?: Record<string, any>[];
  watermark?: string;
}

export interface DocumentGenerationJobData {
  documentRecordId: string;
  documentType: string;
  entityId: string;
  outputFormat: string;
  parameters: Record<string, any>;
  lines: Record<string, any>[];
  watermark?: string;
}

/**
 * Orchestrates the full generation pipeline: resolve renderer -> render bytes
 * -> upload to MinIO -> persist metadata. Supports a synchronous path (callers
 * that need the returned id immediately) and a queued path (fire-and-forget).
 */
@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly registry: DocumentRendererRegistry,
    private readonly storage: DocumentStorageService,
    @InjectRepository(GeneratedDocumentTypeOrmEntity)
    private readonly repo: Repository<GeneratedDocumentTypeOrmEntity>,
    @InjectQueue(DOCUMENT_GENERATION_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  /** Render synchronously and return the persisted (completed/failed) row. */
  async generateSync(
    request: GenerateDocumentInput,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    const record = await this.repo.save(this.buildRecord(request));
    return this.renderInto(record, request, true);
  }

  /** Persist a pending row and enqueue the render job (non-blocking). */
  async generateQueued(
    request: GenerateDocumentInput,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    const record = await this.repo.save(this.buildRecord(request));
    const jobData: DocumentGenerationJobData = {
      documentRecordId: record.id,
      documentType: request.documentType,
      entityId: request.entityId,
      outputFormat: request.outputFormat ?? 'pdf',
      parameters: request.parameters ?? {},
      lines: request.lines ?? [],
      watermark: request.watermark,
    };
    try {
      await this.queue.add('generate', jobData);
    } catch (err: any) {
      record.status = 'failed';
      record.errorMessage = `Failed to enqueue generation: ${err?.message ?? err}`;
      record.completedAt = new Date();
      await this.repo.save(record);
      this.logger.error(
        `Failed to enqueue document ${record.id}: ${err?.message}`,
      );
    }
    return record;
  }

  /** Process a queued job (called by the BullMQ processor). */
  async process(jobData: DocumentGenerationJobData): Promise<void> {
    const record = await this.repo.findOne({
      where: { id: jobData.documentRecordId } as any,
    });
    if (!record) {
      this.logger.warn(
        `Document record ${jobData.documentRecordId} no longer exists; skipping`,
      );
      return;
    }
    await this.renderInto(
      record,
      {
        documentType: jobData.documentType,
        entityId: jobData.entityId,
        outputFormat: jobData.outputFormat,
        parameters: jobData.parameters,
        lines: jobData.lines,
        watermark: jobData.watermark,
      },
      false,
    );
  }

  private buildRecord(
    request: GenerateDocumentInput,
  ): GeneratedDocumentTypeOrmEntity {
    const requestedBy = UUID_PATTERN.test(request.requestedBy ?? '')
      ? (request.requestedBy as string)
      : NIL_UUID;
    return this.repo.create({
      documentType: request.documentType,
      entityId: request.entityId,
      fileName: '',
      minioPath: '',
      minioBucket: '',
      contentType: 'application/pdf',
      fileSize: 0,
      status: 'pending',
      outputFormat: request.outputFormat ?? 'pdf',
      parameters: request.parameters ?? {},
      requestedBy,
      requestedAt: new Date(),
    });
  }

  private async renderInto(
    record: GeneratedDocumentTypeOrmEntity,
    request: GenerateDocumentInput,
    rethrow: boolean,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    try {
      const renderer = this.registry.resolve(request.documentType);
      const renderRequest: RenderRequest = {
        documentType: request.documentType,
        entityId: request.entityId,
        outputFormat: request.outputFormat ?? 'pdf',
        parameters: request.parameters ?? {},
        lines: request.lines ?? [],
        watermark: request.watermark,
      };
      const result = await renderer.render(renderRequest);
      const { bucket, objectName } = await this.storage.upload(
        result.buffer,
        result.contentType,
        result.fileName,
        `generated/${request.documentType}`,
      );

      await this.supersede(request.documentType, request.entityId, record.id);

      record.minioBucket = bucket;
      record.minioPath = `${bucket}/${objectName}`;
      record.fileName = result.fileName;
      record.fileSize = result.size;
      record.contentType = result.contentType;
      record.status = 'completed';
      record.errorMessage = null as any;
      record.completedAt = new Date();
      const saved = await this.repo.save(record);
      this.logger.log(
        `Document ${request.documentType} ${record.id} completed (${result.size} bytes)`,
      );
      return saved;
    } catch (err: any) {
      record.status = 'failed';
      record.errorMessage = err?.message ?? String(err);
      record.completedAt = new Date();
      await this.repo.save(record);
      this.logger.error(
        `Document ${request.documentType} ${record.id} failed: ${err?.message ?? err}`,
      );
      if (rethrow) throw err;
      return record;
    }
  }

  /** Delete any earlier file(s) for the same type+entity (Q3=B, no history). */
  private async supersede(
    documentType: string,
    entityId: string,
    keepId: string,
  ): Promise<void> {
    if (!entityId) return;
    const previous = await this.repo.find({
      where: { documentType, entityId } as any,
    });
    for (const prev of previous) {
      if (prev.id === keepId) continue;
      if (prev.minioBucket && prev.minioPath) {
        const prefix = `${prev.minioBucket}/`;
        const objectName = prev.minioPath.startsWith(prefix)
          ? prev.minioPath.slice(prefix.length)
          : prev.minioPath;
        if (objectName) {
          await this.storage.delete(prev.minioBucket, objectName);
        }
      }
      await this.repo.remove(prev);
    }
  }
}
