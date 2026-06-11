import { Closing } from '../entities/closing.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface ClosingRepositoryPort extends RepositoryPort<Closing> {
  findByEntityId(entityType: string, entityId: string): Promise<Closing | null>;
  findByEntityNumber(entityNumber: string): Promise<Closing | null>;
}

export const CLOSING_REPOSITORY = Symbol('CLOSING_REPOSITORY');
