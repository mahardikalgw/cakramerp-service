import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { RefreshToken } from '../entities/refresh-token.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthRepositoryPort extends RepositoryPort<RefreshToken> {
  findByTokenHash(hash: string): Promise<RefreshToken | null>;
  deleteByUserId(userId: string): Promise<void>;
}
