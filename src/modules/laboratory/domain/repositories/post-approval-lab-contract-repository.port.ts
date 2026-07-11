import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { PostApprovalLabContract } from '../entities/post-approval-lab-contract.entity';

export const POST_APPROVAL_LAB_CONTRACT_REPOSITORY = Symbol(
  'POST_APPROVAL_LAB_CONTRACT_REPOSITORY',
);

export interface PostApprovalLabContractRepositoryPort extends RepositoryPort<PostApprovalLabContract> {
  findByContractNumber(
    contractNumber: string,
  ): Promise<PostApprovalLabContract | null>;
  findByTestingRequestId(
    testingRequestId: string,
  ): Promise<PostApprovalLabContract | null>;
  getLastContractNumber(): Promise<string | null>;
  generateNextContractNumber(): Promise<string>;
  softDelete(id: string): Promise<void>;
}
