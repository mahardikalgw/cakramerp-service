import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { DeviceToken } from '../../domain/entities/device-token.entity';
import { DeviceTokenTypeOrmEntity } from '../entities/device-token-typeorm.entity';
import { DeviceTokenRepositoryPort } from '../../domain/repositories/device-token-repository.port';

@Injectable()
export class DeviceTokenTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<DeviceToken, DeviceTokenTypeOrmEntity>
  implements DeviceTokenRepositoryPort
{
  protected readonly repository: Repository<DeviceTokenTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(DeviceTokenTypeOrmEntity);
  }

  toDomain(entity: DeviceTokenTypeOrmEntity): DeviceToken {
    return new DeviceToken({
      id: entity.id,
      userId: entity.userId,
      platform: entity.platform as 'ios' | 'android',
      token: entity.token,
      deviceName: entity.deviceName,
      appVersion: entity.appVersion,
      osVersion: entity.osVersion,
      isActive: entity.isActive,
      invalidatedAt: entity.invalidatedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: DeviceToken): DeviceTokenTypeOrmEntity {
    const entity = new DeviceTokenTypeOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.platform = domain.platform;
    entity.token = domain.token;
    entity.deviceName = domain.deviceName ?? null;
    entity.appVersion = domain.appVersion ?? null;
    entity.osVersion = domain.osVersion ?? null;
    entity.isActive = domain.isActive ?? true;
    entity.invalidatedAt = domain.invalidatedAt ?? null;
    return entity;
  }

  async findActiveByUserId(userId: string): Promise<DeviceToken[]> {
    const entities = await this.repository.find({
      where: { userId, isActive: true } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async invalidateToken(tokenId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id: tokenId } as any,
      { isActive: false, invalidatedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    const entity = await this.repository.findOne({ where: { token } as any });
    return entity ? this.toDomain(entity) : null;
  }
}
