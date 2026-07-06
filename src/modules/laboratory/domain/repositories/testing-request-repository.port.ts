import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { TestingRequest } from '../entities/testing-request.entity';

export const TESTING_REQUEST_REPOSITORY = Symbol('TESTING_REQUEST_REPOSITORY');

export interface TestingRequestRepositoryPort extends RepositoryPort<TestingRequest> {
  findByRequestNumber(requestNumber: string): Promise<TestingRequest | null>;
  getLastRequestNumber(): Promise<string | null>;
  /** Atomically generates the next request number using a PostgreSQL advisory lock. */
  generateNextRequestNumber(): Promise<string>;
  deleteLinesByRequestId(requestId: string): Promise<void>;
  findExpiredUnsignedContracts(now: Date): Promise<TestingRequest[]>;
  softDelete(id: string): Promise<void>;
}
