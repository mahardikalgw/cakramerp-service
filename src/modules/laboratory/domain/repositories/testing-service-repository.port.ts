import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { TestingService } from '../entities/testing-service.entity';

export const TESTING_SERVICE_REPOSITORY = Symbol('TESTING_SERVICE_REPOSITORY');

export interface TestingServiceRepositoryPort extends RepositoryPort<TestingService> {
  findByCode(code: string): Promise<TestingService | null>;
  softDelete(id: string): Promise<void>;
}
