import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { TestingRequest } from '../entities/testing-request.entity';

export const TESTING_REQUEST_REPOSITORY = Symbol('TESTING_REQUEST_REPOSITORY');

export interface TestingRequestRepositoryPort extends RepositoryPort<TestingRequest> {
  findByRequestNumber(requestNumber: string): Promise<TestingRequest | null>;
  getLastRequestNumber(): Promise<string | null>;
  deleteLinesByRequestId(requestId: string): Promise<void>;
  findExpiredUnsignedContracts(now: Date): Promise<TestingRequest[]>;
}
