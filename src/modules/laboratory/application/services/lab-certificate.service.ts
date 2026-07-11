import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { LabCertificate } from '../../domain/entities/lab-certificate.entity';
import type { LabCertificateRepositoryPort } from '../../domain/repositories/lab-certificate-repository.port';
import { LAB_CERTIFICATE_REPOSITORY } from '../../domain/repositories/lab-certificate-repository.port';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import {
  DOCUMENT_TYPES,
  OUTPUT_FORMATS,
} from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { LabActivityLogService } from './lab-activity-log.service';

@Injectable()
export class LabCertificateService {
  constructor(
    @Inject(LAB_CERTIFICATE_REPOSITORY)
    private readonly certificateRepo: LabCertificateRepositoryPort,
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly activityLog: LabActivityLogService,
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;
    return this.certificateRepo.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<LabCertificate | null> {
    return this.certificateRepo.findById(id);
  }

  async findByCertificateNumber(
    certificateNumber: string,
  ): Promise<LabCertificate | null> {
    return this.certificateRepo.findByCertificateNumber(certificateNumber);
  }

  async verifyByQr(qrHash: string): Promise<LabCertificate | null> {
    return this.certificateRepo.findByQrHash(qrHash);
  }

  private generateCertificateNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/CERT-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `CERT-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async generateCertificate(
    testingRequestId: string,
    userId: string,
    userName?: string,
  ): Promise<LabCertificate & { documentRequestId: string }> {
    const request = await this.testingRequestRepo.findById(testingRequestId);
    if (!request) throw new NotFoundException('Testing request not found');
    if (request.status !== 'completed')
      throw new BadRequestException(
        'Only completed testing requests can have certificates generated',
      );

    // generateNextCertificateNumber() atomically picks the next free
    // certificate_number under a PostgreSQL advisory lock and includes
    // soft-deleted rows in the MAX query, so the sequence never
    // collides with a soft-deleted record's UNIQUE constraint.
    const certificateNumber = await this.certificateRepo.generateNextCertificateNumber();

    const qrHash = crypto
      .createHash('sha256')
      .update(`${certificateNumber}:${testingRequestId}:${Date.now()}`)
      .digest('hex');

    const certificate = new LabCertificate({
      certificateNumber,
      testingRequestId: request.id,
      testingRequestNumber: request.requestNumber,
      customerId: request.customerId,
      customerName: (request as any).customerName ?? '',
      sampleCode: '',
      serviceName: '',
      qrHash,
      status: 'draft',
    } as any);

    const saved = await this.certificateRepo.save(certificate);

    const docRequest = await this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.TEST_RESULT_CERTIFICATE,
      entityId: saved.id,
      tenantId: 'default',
      requestedBy: userId,
      outputFormat: OUTPUT_FORMATS[0],
      parameters: {
        certificateNumber: saved.certificateNumber,
        testingRequestId: request.id,
        testingRequestNumber: request.requestNumber,
        customerId: request.customerId,
        qrHash,
      },
    });

    void this.activityLog.log({
      testingRequestId,
      action: 'certificate_generated',
      performedBy: userId,
      performedByName: userName,
      details: {
        certificateId: saved.id,
        certificateNumber,
        qrHash,
        documentRequestId: docRequest.id,
      },
    });

    return Object.assign(saved, { documentRequestId: docRequest.id });
  }

  async issueCertificate(
    certificateId: string,
    userId: string,
    userName?: string,
  ): Promise<LabCertificate> {
    const certificate = await this.certificateRepo.findById(certificateId);
    if (!certificate) throw new NotFoundException('Certificate not found');
    if (certificate.status !== 'draft')
      throw new BadRequestException('Only draft certificates can be issued');

    certificate.status = 'issued';
    certificate.issuedBy = userId;
    certificate.issuedAt = new Date();

    void this.activityLog.log({
      testingRequestId: certificate.testingRequestId,
      action: 'certificate_issued',
      performedBy: userId,
      performedByName: userName,
      details: {
        certificateId,
        certificateNumber: certificate.certificateNumber,
      },
    });

    return this.certificateRepo.save(certificate);
  }

  async revokeCertificate(
    certificateId: string,
    userId: string,
    reason: string,
  ): Promise<LabCertificate> {
    const certificate = await this.certificateRepo.findById(certificateId);
    if (!certificate) throw new NotFoundException('Certificate not found');
    if (certificate.status !== 'issued')
      throw new BadRequestException('Only issued certificates can be revoked');

    certificate.status = 'revoked';
    certificate.revokedBy = userId;
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason;

    return this.certificateRepo.save(certificate);
  }

  async getCertificateDocuments(certificateId: string) {
    return this.docHelper.getDocumentsByEntity(
      DOCUMENT_TYPES.TEST_RESULT_CERTIFICATE,
      certificateId,
    );
  }

  async getCertificateDownloadUrl(documentId: string): Promise<string> {
    return this.docHelper.getDownloadUrl(documentId);
  }

  async delete(id: string): Promise<boolean> {
    const certificate = await this.certificateRepo.findById(id);
    if (!certificate) throw new NotFoundException('Certificate not found');
    return this.certificateRepo.delete(id);
  }
}
