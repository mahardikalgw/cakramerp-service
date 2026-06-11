import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  Closing,
  ClosingChecklistItem,
} from '../../domain/entities/closing.entity';
import { ClosingTypeOrmEntity } from '../entities/closing-typeorm.entity';
import { ClosingChecklistItemTypeOrmEntity } from '../entities/closing-checklist-item-typeorm.entity';
import { ClosingRepositoryPort } from '../../domain/repositories/closing-repository.port';

@Injectable()
export class ClosingTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Closing, ClosingTypeOrmEntity>
  implements ClosingRepositoryPort
{
  protected readonly repository: Repository<ClosingTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(ClosingTypeOrmEntity);
  }

  toDomain(entity: ClosingTypeOrmEntity): Closing {
    return new Closing({
      id: entity.id,
      entityType: entity.entityType as Closing['entityType'],
      entityId: entity.entityId,
      entityNumber: entity.entityNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      status: entity.status as Closing['status'],
      closedBy: entity.closedBy,
      closedAt: entity.closedAt,
      closingReason: entity.closingReason,
      items: Array.isArray(entity.items)
        ? entity.items.map(
            (i) =>
              new ClosingChecklistItem({
                id: i.id,
                closingId: i.closingId,
                itemType: i.itemType as ClosingChecklistItem['itemType'],
                itemName: i.itemName,
                completed: i.completed,
                completedBy: i.completedBy,
                completedAt: i.completedAt,
                notes: i.notes,
                createdAt: i.createdAt,
                updatedAt: i.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Closing): ClosingTypeOrmEntity {
    const entity = new ClosingTypeOrmEntity();
    entity.id = domain.id;
    entity.entityType = domain.entityType;
    entity.entityId = domain.entityId;
    entity.entityNumber = domain.entityNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName ?? '';
    entity.status = domain.status ?? 'pending';
    entity.closedBy = domain.closedBy ?? '';
    entity.closedAt = domain.closedAt ?? new Date();
    entity.closingReason = domain.closingReason ?? '';
    entity.items = domain.items?.map((i) => {
      const itemEntity = new ClosingChecklistItemTypeOrmEntity();
      itemEntity.id = i.id;
      itemEntity.closingId = i.closingId;
      itemEntity.itemType = i.itemType;
      itemEntity.itemName = i.itemName;
      itemEntity.completed = i.completed ?? false;
      itemEntity.completedBy = i.completedBy ?? '';
      itemEntity.completedAt = i.completedAt ?? new Date();
      itemEntity.notes = i.notes ?? '';
      return itemEntity;
    });
    return entity;
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Closing | null> {
    const entity = await this.repository.findOne({
      where: { entityType, entityId } as any,
      relations: ['items'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEntityNumber(entityNumber: string): Promise<Closing | null> {
    const entity = await this.repository.findOne({
      where: { entityNumber } as any,
      relations: ['items'],
    });
    return entity ? this.toDomain(entity) : null;
  }
}
