import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { SalesReturn } from '../../domain/entities/sales-return.entity';
import { SalesReturnLine } from '../../domain/entities/sales-return-line.entity';
import { SalesReturnTypeOrmEntity } from '../entities/sales-return-typeorm.entity';
import { SalesReturnLineTypeOrmEntity } from '../entities/sales-return-line-typeorm.entity';
import { SalesReturnRepositoryPort } from '../../domain/repositories/sales-return-repository.port';

@Injectable()
export class SalesReturnTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<SalesReturn, SalesReturnTypeOrmEntity>
  implements SalesReturnRepositoryPort
{
  protected readonly repository: Repository<SalesReturnTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SalesReturnTypeOrmEntity);
  }

  toDomain(entity: SalesReturnTypeOrmEntity): SalesReturn {
    return new SalesReturn({
      id: entity.id,
      returnNumber: entity.returnNumber,
      salesOrderId: entity.salesOrderId,
      customerId: entity.customerId,
      customerName: entity.customerName,
      returnDate: entity.returnDate,
      status: entity.status as SalesReturn['status'],
      totalAmount: Number(entity.totalAmount),
      reason: entity.reason,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      rejectionReason: entity.rejectionReason,
      glPostingQueueId: entity.glPostingQueueId,
      journalEntryId: entity.journalEntryId,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new SalesReturnLine({
                id: line.id,
                salesReturnId: line.salesReturnId,
                itemId: line.itemId,
                itemName: line.itemName,
                quantity: Number(line.quantity),
                uom: line.uom,
                unitPrice: Number(line.unitPrice),
                amount: Number(line.amount),
                reason: line.reason,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: SalesReturn): SalesReturnTypeOrmEntity {
    const entity = new SalesReturnTypeOrmEntity();
    entity.id = domain.id;
    entity.returnNumber = domain.returnNumber;
    entity.salesOrderId = domain.salesOrderId;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.returnDate = domain.returnDate;
    entity.status = domain.status;
    entity.totalAmount = domain.totalAmount;
    entity.reason = domain.reason;
    entity.approvedBy = domain.approvedBy;
    entity.approvedAt = domain.approvedAt;
    entity.rejectionReason = domain.rejectionReason;
    entity.glPostingQueueId = domain.glPostingQueueId;
    entity.journalEntryId = domain.journalEntryId;
    entity.lines = domain.lines.map((line) => {
      const lineEntity = new SalesReturnLineTypeOrmEntity();
      lineEntity.id = line.id;
      lineEntity.salesReturnId = line.salesReturnId ?? domain.id;
      lineEntity.itemId = line.itemId;
      lineEntity.itemName = line.itemName;
      lineEntity.quantity = line.quantity;
      lineEntity.uom = line.uom;
      lineEntity.unitPrice = line.unitPrice;
      lineEntity.amount = line.amount;
      lineEntity.reason = line.reason;
      return lineEntity;
    });
    return entity;
  }

  async findByReturnNumber(returnNumber: string): Promise<SalesReturn | null> {
    const entity = await this.repository.findOne({
      where: { returnNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastReturnNumber(prefix: string): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('sr')
      .select('sr.returnNumber', 'returnNumber')
      .where('sr.returnNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('sr.returnNumber', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.returnNumber ?? null;
  }
}
