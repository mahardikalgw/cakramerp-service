import { LabCertificate } from '../entities/lab-certificate.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface LabCertificateRepositoryPort extends RepositoryPort<LabCertificate> {
  findByCertificateNumber(
    certificateNumber: string,
  ): Promise<LabCertificate | null>;
  findByQrHash(qrHash: string): Promise<LabCertificate | null>;
  findByTestingRequestId(testingRequestId: string): Promise<LabCertificate[]>;
  getLastCertificateNumber(): Promise<string | null>;
  generateNextCertificateNumber(): Promise<string>;
  softDelete(id: string): Promise<void>;
}

export const LAB_CERTIFICATE_REPOSITORY = Symbol('LAB_CERTIFICATE_REPOSITORY');
