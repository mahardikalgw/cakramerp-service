import { DeviceToken } from '../entities/device-token.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface DeviceTokenRepositoryPort extends RepositoryPort<DeviceToken> {
  findActiveByUserId(userId: string): Promise<DeviceToken[]>;
  invalidateToken(tokenId: string): Promise<boolean>;
  findByToken(token: string): Promise<DeviceToken | null>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');
