import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { AuditLog, AuditAction } from '../../domain/entities/audit-log.entity';
import { AuditLogRepositoryPort } from '../../domain/repositories/audit-log-repository.port';
import {
  AuditLogTypeOrmEntity,
  AuditActionType,
} from '../entities/audit-log-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';

interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<AuditLog, AuditLogTypeOrmEntity>
  implements AuditLogRepositoryPort
{
  protected readonly repository: Repository<AuditLogTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(AuditLogTypeOrmEntity);
  }

  toDomain(entity: AuditLogTypeOrmEntity): AuditLog {
    return new AuditLog({
      id: entity.id,
      userId: entity.userId,
      userName: entity.userName,
      action: entity.action as unknown as AuditAction,
      module: entity.module,
      recordId: entity.recordId,
      ipAddress: entity.ipAddress,
      payload: entity.payload,
      timestamp: entity.timestamp,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: AuditLog): AuditLogTypeOrmEntity {
    const entity = new AuditLogTypeOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.userName = domain.userName;
    entity.action = domain.action as unknown as AuditActionType;
    entity.module = domain.module;
    entity.recordId = domain.recordId;
    entity.ipAddress = domain.ipAddress;

    entity.payload = domain.payload;
    entity.timestamp = domain.timestamp;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByUserId(
    userId: string,
    options?: PaginationOptions,
  ): Promise<FindResult<AuditLog>> {
    const { page = 1, limit = 20 } = options || {};
    const [data, total] = await this.repository.findAndCount({
      where: { userId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((entity) => this.toDomain(entity)),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByModule(
    module: string,
    options?: PaginationOptions,
  ): Promise<FindResult<AuditLog>> {
    const { page = 1, limit = 20 } = options || {};
    const [data, total] = await this.repository.findAndCount({
      where: { module },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((entity) => this.toDomain(entity)),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByAction(
    action: string,
    options?: PaginationOptions,
  ): Promise<FindResult<AuditLog>> {
    const { page = 1, limit = 20 } = options || {};
    const [data, total] = await this.repository.findAndCount({
      where: { action: action as AuditActionType },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((entity) => this.toDomain(entity)),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: PaginationOptions,
  ): Promise<FindResult<AuditLog>> {
    const { page = 1, limit = 20 } = options || {};
    const [data, total] = await this.repository.findAndCount({
      where: { timestamp: Between(startDate, endDate) },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((entity) => this.toDomain(entity)),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}
