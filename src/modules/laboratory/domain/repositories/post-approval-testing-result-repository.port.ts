import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { PostApprovalTestingResult } from '../entities/post-approval-testing-result.entity';

export const POST_APPROVAL_TESTING_RESULT_REPOSITORY = Symbol(
  'POST_APPROVAL_TESTING_RESULT_REPOSITORY',
);

export interface PostApprovalTestingResultRepositoryPort extends RepositoryPort<PostApprovalTestingResult> {
  findBySampleId(sampleId: string): Promise<PostApprovalTestingResult | null>;
  findByContractId(contractId: string): Promise<PostApprovalTestingResult[]>;
  findByScheduleSampleUnit(
    scheduleSampleId: string,
    sampleUnit: number,
  ): Promise<PostApprovalTestingResult | null>;
  findByScheduleId(scheduleId: string): Promise<PostApprovalTestingResult[]>;
}
