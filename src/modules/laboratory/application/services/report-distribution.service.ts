import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ReportDistribution,
  ArchivedDocument,
} from '../../domain/entities/report-distribution.entity';
import type { ReportDistributionRepositoryPort } from '../../domain/repositories/report-distribution-repository.port';
import { REPORT_DISTRIBUTION_REPOSITORY } from '../../domain/repositories/report-distribution-repository.port';
import type { ArchivedDocumentRepositoryPort } from '../../domain/repositories/report-distribution-repository.port';
import { ARCHIVED_DOCUMENT_REPOSITORY } from '../../domain/repositories/report-distribution-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class ReportDistributionService {
  constructor(
    @Inject(REPORT_DISTRIBUTION_REPOSITORY)
    private readonly distributionRepo: ReportDistributionRepositoryPort,
    @Inject(ARCHIVED_DOCUMENT_REPOSITORY)
    private readonly archiveRepo: ArchivedDocumentRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
  ) {}

  async findAll(options?: {
    documentType?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.documentType) filters.documentType = options.documentType;
    if (options?.channel) filters.channel = options.channel;
    if (options?.status) filters.status = options.status;
    return this.distributionRepo.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<ReportDistribution | null> {
    return this.distributionRepo.findById(id);
  }

  async distribute(
    documentType: string,
    documentId: string,
    documentNumber: string,
    customerId: string,
    customerName: string,
    channel: 'email' | 'portal' | 'physical' | 'whatsapp',
    recipientEmail?: string,
    recipientName?: string,
  ): Promise<ReportDistribution> {
    const distribution = new ReportDistribution({
      documentType,
      documentId,
      documentNumber,
      customerId,
      customerName,
      channel,
      recipientEmail: recipientEmail ?? null,
      recipientName: recipientName ?? null,
      status: 'pending',
      retryCount: 0,
    } as any);

    const saved = await this.distributionRepo.save(distribution);

    if (channel === 'email') {
      try {
        saved.status = 'sent';
        saved.sentAt = new Date();
        await this.distributionRepo.save(saved);
      } catch {
        saved.status = 'failed';
        saved.failureReason = 'Email delivery failed';
        saved.retryCount += 1;
        await this.distributionRepo.save(saved);
      }
    } else if (channel === 'portal') {
      saved.status = 'delivered';
      saved.deliveredAt = new Date();
      await this.distributionRepo.save(saved);
    }

    return saved;
  }

  async retryDistribution(id: string): Promise<ReportDistribution> {
    const distribution = await this.distributionRepo.findById(id);
    if (!distribution) throw new NotFoundException('Distribution not found');
    if (distribution.status !== 'failed')
      throw new Error('Only failed distributions can be retried');

    distribution.status = 'pending';
    distribution.retryCount += 1;
    distribution.failureReason = null;

    const saved = await this.distributionRepo.save(distribution);

    if (distribution.channel === 'email') {
      try {
        saved.status = 'sent';
        saved.sentAt = new Date();
        await this.distributionRepo.save(saved);
      } catch {
        saved.status = 'failed';
        saved.failureReason = 'Email delivery failed';
        await this.distributionRepo.save(saved);
      }
    }

    return saved;
  }

  async archiveDocument(
    documentType: string,
    entityId: string,
    documentNumber: string,
    customerId: string,
    customerName: string,
    userId: string,
  ): Promise<any> {
    const existing = await this.archiveRepo.findByEntityId(
      documentType,
      entityId,
    );
    if (existing) return existing;

    const documents = await this.docHelper.getDocumentsByEntity(
      DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] ??
        documentType,
      entityId,
    );

    const latestDoc =
      documents.length > 0 ? documents[documents.length - 1] : null;

    const archive = new ArchivedDocument({
      documentType: documentType as any,
      entityId,
      documentNumber,
      minioPath: latestDoc?.minioPath ?? '',
      minioBucket: latestDoc?.minioBucket ?? 'documents',
      contentType: 'application/pdf',
      fileSize: latestDoc?.fileSize ?? null,
      customerId,
      customerName,
      archivedBy: userId,
      archivedAt: new Date(),
      retentionPeriodDays: 1825,
    } as any);

    return this.archiveRepo.save(archive);
  }

  async getArchivedDocuments(customerId?: string, documentType?: string) {
    if (customerId) {
      return this.archiveRepo.findByCustomerId(customerId);
    }
    const filters: Record<string, any> = {};
    if (documentType) filters.documentType = documentType;
    return this.archiveRepo.findAll({ filters });
  }

  async getArchivedDocument(id: string) {
    return this.archiveRepo.findById(id);
  }

  async deleteDistribution(id: string): Promise<boolean> {
    const distribution = await this.distributionRepo.findById(id);
    if (!distribution) throw new NotFoundException('Report distribution not found');
    return this.distributionRepo.delete(id);
  }

  async deleteArchivedDocument(id: string): Promise<boolean> {
    const archive = await this.archiveRepo.findById(id);
    if (!archive) throw new NotFoundException('Archived document not found');
    return this.archiveRepo.delete(id);
  }
}
