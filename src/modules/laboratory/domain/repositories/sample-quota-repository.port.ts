import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { SampleQuota } from '../entities/sample-quota.entity';

export const SAMPLE_QUOTA_REPOSITORY = Symbol('SAMPLE_QUOTA_REPOSITORY');

export interface SampleQuotaRepositoryPort extends RepositoryPort<SampleQuota> {
  findByTestingRequestId(requestId: string): Promise<SampleQuota[]>;
  findByCustomerId(customerId: string): Promise<SampleQuota[]>;
  saveMany(quotas: SampleQuota[]): Promise<SampleQuota[]>;
  softDelete(id: string): Promise<void>;
}
