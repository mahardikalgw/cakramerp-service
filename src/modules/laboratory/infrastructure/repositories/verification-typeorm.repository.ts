import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  Verification,
  VerificationChecklistItem,
} from '../../domain/entities/verification.entity';
import { VerificationTypeOrmEntity } from '../entities/verification-typeorm.entity';
import { VerificationChecklistItemTypeOrmEntity } from '../entities/verification-checklist-item-typeorm.entity';
import { VerificationRepositoryPort } from '../../domain/repositories/verification-repository.port';

@Injectable()
export class VerificationTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Verification, VerificationTypeOrmEntity>
  implements VerificationRepositoryPort
{
  protected readonly repository: Repository<VerificationTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(VerificationTypeOrmEntity);
  }

  toDomain(entity: VerificationTypeOrmEntity): Verification {
    return new Verification({
      id: entity.id,
      entityType: entity.entityType as 'contract' | 'purchase_order',
      entityId: entity.entityId,
      entityNumber: entity.entityNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      status: entity.status as Verification['status'],
      verifiedBy: entity.verifiedBy,
      verifiedAt: entity.verifiedAt,
      rejectionReason: entity.rejectionReason,
      activatedAt: entity.activatedAt,
      items: Array.isArray(entity.items)
        ? entity.items.map(
            (i) =>
              new VerificationChecklistItem({
                id: i.id,
                verificationId: i.verificationId,
                itemType: i.itemType as VerificationChecklistItem['itemType'],
                itemName: i.itemName,
                documentUrl: i.documentUrl,
                verified: i.verified,
                verifiedBy: i.verifiedBy,
                verifiedAt: i.verifiedAt,
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

  toEntity(domain: Verification): VerificationTypeOrmEntity {
    const entity = new VerificationTypeOrmEntity();
    entity.id = domain.id;
    entity.entityType = domain.entityType;
    entity.entityId = domain.entityId;
    entity.entityNumber = domain.entityNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName ?? '';
    entity.status = domain.status ?? 'pending';
    entity.verifiedBy = domain.verifiedBy ?? '';
    entity.verifiedAt = domain.verifiedAt ?? new Date();
    entity.rejectionReason = domain.rejectionReason ?? '';
    entity.activatedAt = domain.activatedAt ?? new Date();
    entity.items = domain.items?.map((i) => {
      const itemEntity = new VerificationChecklistItemTypeOrmEntity();
      itemEntity.id = i.id;
      itemEntity.verificationId = i.verificationId;
      itemEntity.itemType = i.itemType;
      itemEntity.itemName = i.itemName;
      itemEntity.documentUrl = i.documentUrl ?? '';
      itemEntity.verified = i.verified ?? false;
      itemEntity.verifiedBy = i.verifiedBy ?? '';
      itemEntity.verifiedAt = i.verifiedAt ?? new Date();
      itemEntity.notes = i.notes ?? '';
      return itemEntity;
    });
    return entity;
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Verification | null> {
    const entity = await this.repository.findOne({
      where: { entityType, entityId } as any,
      relations: ['items'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEntityNumber(entityNumber: string): Promise<Verification | null> {
    const entity = await this.repository.findOne({
      where: { entityNumber } as any,
      relations: ['items'],
    });
    return entity ? this.toDomain(entity) : null;
  }
}
