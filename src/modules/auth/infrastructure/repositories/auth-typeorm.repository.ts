import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { AuthRepositoryPort } from '../../domain/repositories/auth-repository.port';
import { RefreshTokenTypeOrmEntity } from '../entities/refresh-token-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class AuthTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<RefreshToken, RefreshTokenTypeOrmEntity>
  implements AuthRepositoryPort
{
  protected readonly repository: Repository<RefreshTokenTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(RefreshTokenTypeOrmEntity);
  }

  toDomain(entity: RefreshTokenTypeOrmEntity): RefreshToken {
    return new RefreshToken({
      id: entity.id,
      userId: entity.userId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: RefreshToken): RefreshTokenTypeOrmEntity {
    const entity = new RefreshTokenTypeOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.tokenHash = domain.tokenHash;
    entity.expiresAt = domain.expiresAt;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    // Only load unexpired tokens, most recent first, capped at 5
    // This reduces worst-case from 100 bcrypt.compare to 5
    const entities = await this.repository.find({
      where: { expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    for (const entity of entities) {
      const match = await bcryptjs.compare(hash, entity.tokenHash);
      if (match) return this.toDomain(entity);
    }
    return null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  // RefreshTokenTypeOrmEntity does not have a @DeleteDateColumn,
  // so we override the base delete() to use hard delete instead of softDelete.
  override async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
