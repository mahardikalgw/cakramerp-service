import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { PostApprovalTestingSchedule } from '../entities/post-approval-testing-schedule.entity';

export const POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY = Symbol(
  'POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY',
);

export interface PostApprovalTestingScheduleRepositoryPort extends RepositoryPort<PostApprovalTestingSchedule> {
  findByContractId(contractId: string): Promise<PostApprovalTestingSchedule[]>;
  findByLaboranId(laboranId: string): Promise<PostApprovalTestingSchedule[]>;
}
