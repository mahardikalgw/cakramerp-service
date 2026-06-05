import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { TestResult } from '../entities/test-result.entity';

export const TEST_RESULT_REPOSITORY = Symbol('TEST_RESULT_REPOSITORY');

export interface TestResultRepositoryPort extends RepositoryPort<TestResult> {
  findByResultNumber(resultNumber: string): Promise<TestResult | null>;
  getLastResultNumber(): Promise<string | null>;
  findBySampleId(sampleId: string): Promise<TestResult[]>;
  findByTestingRequestId(testingRequestId: string): Promise<TestResult[]>;
}
