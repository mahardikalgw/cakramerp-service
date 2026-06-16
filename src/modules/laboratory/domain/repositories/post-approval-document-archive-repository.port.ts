import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { PostApprovalDocumentArchive } from '../entities/post-approval-document-archive.entity';

export const POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY = Symbol(
  'POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY',
);

export interface PostApprovalDocumentArchiveRepositoryPort
  extends RepositoryPort<PostApprovalDocumentArchive> {
  findByContractId(
    contractId: string,
  ): Promise<PostApprovalDocumentArchive[]>;
  findByTestingResultId(
    testingResultId: string,
  ): Promise<PostApprovalDocumentArchive | null>;
  findByDocumentNumber(
    documentNumber: string,
  ): Promise<PostApprovalDocumentArchive | null>;
}