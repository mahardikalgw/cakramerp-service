import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { SalesOrder } from '../../domain/entities/sales-order.entity';
import { SalesOrderLine } from '../../domain/entities/sales-order-line.entity';
import { SalesOrderTypeOrmEntity } from '../entities/sales-order-typeorm.entity';
import { SalesOrderLineTypeOrmEntity } from '../entities/sales-order-line-typeorm.entity';
import { SalesOrderRepositoryPort } from '../../domain/repositories/sales-order-repository.port';

@Injectable()
export class SalesOrderTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<SalesOrder, SalesOrderTypeOrmEntity>
  implements SalesOrderRepositoryPort
{
  protected readonly repository: Repository<SalesOrderTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SalesOrderTypeOrmEntity);
  }

  toDomain(entity: SalesOrderTypeOrmEntity): SalesOrder {
    return new SalesOrder({
      id: entity.id,
      soNumber: entity.soNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      quotationId: entity.quotationId,
      orderDate: entity.orderDate,
      expectedDeliveryDate: entity.expectedDeliveryDate,
      status: entity.status as SalesOrder['status'],
      totalAmount: Number(entity.totalAmount),
      discountAmount: Number(entity.discountAmount),
      taxAmount: Number(entity.taxAmount),
      grandTotal: Number(entity.grandTotal),
      paymentTermDays: entity.paymentTermDays,
      paymentTermLabel: entity.paymentTermLabel,
      notes: entity.notes,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      rejectionReason: entity.rejectionReason,
      glPostingQueueId: entity.glPostingQueueId,
      journalEntryId: entity.journalEntryId,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new SalesOrderLine({
                id: line.id,
                salesOrderId: line.salesOrderId,
                quotationLineId: line.quotationLineId,
                itemId: line.itemId,
                itemName: line.itemName,
                description: line.description,
                quantity: Number(line.quantity),
                deliveredQuantity: Number(line.deliveredQuantity),
                uom: line.uom,
                unitPrice: Number(line.unitPrice),
                taxPercent: Number(line.taxPercent),
                amount: Number(line.amount),
                discountAmount: Number(line.discountAmount),
                lineType: line.lineType,
                fulfillmentStatus: line.fulfillmentStatus,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: SalesOrder): SalesOrderTypeOrmEntity {
    const entity = new SalesOrderTypeOrmEntity();
    entity.id = domain.id;
    entity.soNumber = domain.soNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.quotationId = domain.quotationId;
    entity.orderDate = domain.orderDate;
    entity.expectedDeliveryDate = domain.expectedDeliveryDate;
    entity.status = domain.status;
    entity.totalAmount = domain.totalAmount;
    entity.discountAmount = domain.discountAmount;
    entity.taxAmount = domain.taxAmount;
    entity.grandTotal = domain.grandTotal;
    entity.paymentTermDays = domain.paymentTermDays;
    entity.paymentTermLabel = domain.paymentTermLabel;
    entity.notes = domain.notes;
    entity.approvedBy = domain.approvedBy;
    entity.approvedAt = domain.approvedAt;
    entity.rejectionReason = domain.rejectionReason;
    entity.glPostingQueueId = domain.glPostingQueueId;
    entity.journalEntryId = domain.journalEntryId;
    entity.lines = domain.lines.map((line) => {
      const lineEntity = new SalesOrderLineTypeOrmEntity();
      lineEntity.id = line.id;
      lineEntity.salesOrderId = line.salesOrderId ?? domain.id;
      lineEntity.quotationLineId = line.quotationLineId;
      lineEntity.itemId = line.itemId;
      lineEntity.itemName = line.itemName;
      lineEntity.description = line.description;
      lineEntity.quantity = line.quantity;
      lineEntity.deliveredQuantity = line.deliveredQuantity;
      lineEntity.uom = line.uom;
      lineEntity.unitPrice = line.unitPrice;
      lineEntity.taxPercent = line.taxPercent;
      lineEntity.amount = line.amount;
      lineEntity.discountAmount = line.discountAmount;
      lineEntity.lineType = line.lineType;
      lineEntity.fulfillmentStatus = line.fulfillmentStatus;
      return lineEntity;
    });
    return entity;
  }

  async findBySoNumber(soNumber: string): Promise<SalesOrder | null> {
    const entity = await this.repository.findOne({
      where: { soNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastSoNumber(prefix: string): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('so')
      .select('so.soNumber', 'soNumber')
      .where('so.soNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('so.soNumber', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.soNumber ?? null;
  }
}
