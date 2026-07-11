import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { LabCertificate } from '../../domain/entities/lab-certificate.entity';
import { LabCertificateTypeOrmEntity } from '../entities/lab-certificate-typeorm.entity';
import { LabCertificateRepositoryPort } from '../../domain/repositories/lab-certificate-repository.port';
import {
  SequenceGenerator,
  ADVISORY_LOCK_KEYS,
} from '../../../../shared/kernel/infrastructure/database/sequence-generator';

@Injectable()
export class LabCertificateTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    LabCertificate,
    LabCertificateTypeOrmEntity
  >
  implements LabCertificateRepositoryPort
{
  protected readonly repository: Repository<LabCertificateTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LabCertificateTypeOrmEntity);
  }

  toDomain(entity: LabCertificateTypeOrmEntity): LabCertificate {
    return new LabCertificate({
      id: entity.id,
      certificateNumber: entity.certificateNumber,
      testingRequestId: entity.testingRequestId,
      testingRequestNumber: entity.testingRequestNumber,
      testResultId: entity.testResultId,
      resultNumber: entity.resultNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      sampleCode: entity.sampleCode,
      testingServiceId: entity.testingServiceId,
      serviceName: entity.serviceName,
      qrHash: entity.qrHash,
      issuedBy: entity.issuedBy,
      issuedAt: entity.issuedAt,
      revokedBy: entity.revokedBy,
      revokedAt: entity.revokedAt,
      revocationReason: entity.revocationReason,
      minioPath: entity.minioPath,
      status: entity.status as LabCertificate['status'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: LabCertificate): LabCertificateTypeOrmEntity {
    const entity = new LabCertificateTypeOrmEntity();
    entity.id = domain.id;
    entity.certificateNumber = domain.certificateNumber;
    entity.testingRequestId = domain.testingRequestId;
    entity.testingRequestNumber = domain.testingRequestNumber;
    entity.testResultId = domain.testResultId || (null as any);
    entity.resultNumber = domain.resultNumber ?? '';
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName ?? '';
    entity.sampleCode = domain.sampleCode ?? '';
    entity.testingServiceId = domain.testingServiceId || (null as any);
    entity.serviceName = domain.serviceName ?? '';
    entity.qrHash = domain.qrHash ?? '';
    entity.issuedBy = domain.issuedBy ?? '';
    entity.issuedAt = domain.issuedAt ?? new Date();
    entity.revokedBy = domain.revokedBy ?? '';
    entity.revokedAt = domain.revokedAt ?? new Date();
    entity.revocationReason = domain.revocationReason ?? '';
    entity.minioPath = domain.minioPath ?? '';
    entity.status = domain.status ?? 'draft';
    return entity;
  }

  async findByCertificateNumber(
    certificateNumber: string,
  ): Promise<LabCertificate | null> {
    const entity = await this.repository.findOne({
      where: { certificateNumber, deletedAt: IsNull() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByQrHash(qrHash: string): Promise<LabCertificate | null> {
    const entity = await this.repository.findOne({
      where: { qrHash, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByTestingRequestId(
    testingRequestId: string,
  ): Promise<LabCertificate[]> {
    const entities = await this.repository.find({
      where: { testingRequestId, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async getLastCertificateNumber(): Promise<string | null> {
    // Kept for backward compatibility. The new
    // generateNextCertificateNumber() should be used for create flow.
    const row = await this.repository
      .createQueryBuilder('lc')
      .select('lc.certificate_number', 'certificateNumber')
      .orderBy(
        "CAST(SUBSTRING(lc.certificate_number FROM 'CERT-\\d{4}-(\\d+)') AS INTEGER)",
        'DESC',
      )
      .limit(1)
      .getRawOne();
    return row?.certificateNumber ?? null;
  }

  /**
   * Atomically generates the next certificate_number using a
   * PostgreSQL advisory lock + numeric sort. Replaces the old buggy
   * implementation that sorted strings lexicographically and
   * filtered `deleted_at IS NULL` — both caused duplicate-key
   * violations on certificate generation. See sequence-generator.ts
   * for the full rationale.
   */
  async generateNextCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = new SequenceGenerator(this.dataSource, {
      prefix: `CERT-${year}-`,
      padLength: 5,
      lockKey: ADVISORY_LOCK_KEYS.CERTIFICATE,
    });
    return seq.next('certificate_number', 'lab_certificates');
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
