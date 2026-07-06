import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { LabCertificate } from '../../domain/entities/lab-certificate.entity';
import { LabCertificateTypeOrmEntity } from '../entities/lab-certificate-typeorm.entity';
import { LabCertificateRepositoryPort } from '../../domain/repositories/lab-certificate-repository.port';

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
    const query = this.repository
      .createQueryBuilder('lc')
      .select('lc.certificate_number', 'certificateNumber')
      .where('lc.deleted_at IS NULL')
      .orderBy('lc.certificate_number', 'DESC')
      .limit(1);
    const row = await query.getRawOne();
    return row?.certificateNumber ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
