import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { SampleType } from '../entities/sample-type.entity';

export const SAMPLE_TYPE_REPOSITORY = Symbol('SAMPLE_TYPE_REPOSITORY');

export interface SampleTypeRepositoryPort extends RepositoryPort<SampleType> {
  findByCode(code: string): Promise<SampleType | null>;
}
