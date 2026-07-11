import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Sample } from '../entities/sample.entity';

export const SAMPLE_REPOSITORY = Symbol('SAMPLE_REPOSITORY');

export interface SampleRepositoryPort extends RepositoryPort<Sample> {
  findBySampleCode(sampleCode: string): Promise<Sample | null>;
  getLastSampleCode(): Promise<string | null>;
  generateNextSampleCode(): Promise<string>;
  findByTestingRequestId(testingRequestId: string): Promise<Sample[]>;
  softDelete(id: string): Promise<void>;
}
