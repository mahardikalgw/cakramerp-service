import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Laboratory } from '../entities/laboratory.entity';

export const LABORATORY_REPOSITORY = Symbol('LABORATORY_REPOSITORY');

export interface LaboratoryRepositoryPort extends RepositoryPort<Laboratory> {
  softDelete(id: string): Promise<void>;
}
