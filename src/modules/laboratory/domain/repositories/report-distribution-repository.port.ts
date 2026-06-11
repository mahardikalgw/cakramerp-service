import {
  ReportDistribution,
  ArchivedDocument,
} from '../entities/report-distribution.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface ReportDistributionRepositoryPort extends RepositoryPort<ReportDistribution> {
  findByDocumentId(documentId: string): Promise<ReportDistribution[]>;
  findByCustomerId(customerId: string): Promise<ReportDistribution[]>;
}

export const REPORT_DISTRIBUTION_REPOSITORY = Symbol(
  'REPORT_DISTRIBUTION_REPOSITORY',
);

export interface ArchivedDocumentRepositoryPort extends RepositoryPort<ArchivedDocument> {
  findByEntityId(
    documentType: string,
    entityId: string,
  ): Promise<ArchivedDocument | null>;
  findByCustomerId(customerId: string): Promise<ArchivedDocument[]>;
}

export const ARCHIVED_DOCUMENT_REPOSITORY = Symbol(
  'ARCHIVED_DOCUMENT_REPOSITORY',
);
