import { Verification } from '../entities/verification.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface VerificationRepositoryPort extends RepositoryPort<Verification> {
  findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Verification | null>;
  findByEntityNumber(entityNumber: string): Promise<Verification | null>;
}

export const VERIFICATION_REPOSITORY = Symbol('VERIFICATION_REPOSITORY');
