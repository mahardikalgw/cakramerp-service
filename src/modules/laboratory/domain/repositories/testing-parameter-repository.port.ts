import { RepositoryPort } from '../../../../shared/kernel/domain/ports/repository.port';
import { TestingParameter } from '../entities/testing-parameter.entity';

export const TESTING_PARAMETER_REPOSITORY = 'TESTING_PARAMETER_REPOSITORY';

export interface TestingParameterRepositoryPort
  extends RepositoryPort<TestingParameter> {
  findByTestingServiceId(serviceId: string): Promise<TestingParameter[]>;
  softDelete(id: string): Promise<void>;
}
