import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../../domain/entities/purchase-order-line.entity';
import { PurchaseOrderTypeOrmEntity } from '../entities/purchase-order-typeorm.entity';
import { PurchaseOrderLineTypeOrmEntity } from '../entities/purchase-order-line-typeorm.entity';
import { PurchaseOrderRepositoryPort } from '../../domain/repositories/purchase-order-repository.port';

@Injectable()
export class PurchaseOrderTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    PurchaseOrder,
    PurchaseOrderTypeOrmEntity
  >
  implements PurchaseOrderRepositoryPort
{
  protected readonly repository: Repository<PurchaseOrderTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(PurchaseOrderTypeOrmEntity);
  }

  toDomain(entity: PurchaseOrderTypeOrmEntity): PurchaseOrder {
    return new PurchaseOrder({
      id: entity.id,
      orderNumber: entity.poNumber,
      supplierId: entity.supplierId,
      supplierName: entity.supplierName,
      status: entity.status as PurchaseOrder['status'],
      orderDate: entity.orderDate,
      expectedDate: entity.expectedDeliveryDate,
      totalAmount: Number(entity.totalAmount),
      notes: entity.notes,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new PurchaseOrderLine({
                id: line.id,
                purchaseOrderId: line.purchaseOrderId,
                itemId: line.itemId,
                itemName: line.itemName,
                quantity: Number(line.quantity),
                uom: line.uom,
                unitCost: Number(line.unitCost),
                totalCost: Number(line.totalCost),
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PurchaseOrder): PurchaseOrderTypeOrmEntity {
    const entity = new PurchaseOrderTypeOrmEntity();
    entity.id = domain.id;
    entity.poNumber = domain.orderNumber;
    entity.supplierId = domain.supplierId;
    entity.supplierName = domain.supplierName ?? '';
    entity.purchaseRequestId = domain.purchaseRequestId ?? '';
    entity.orderDate = domain.orderDate ?? new Date();
    entity.expectedDeliveryDate = domain.expectedDate ?? null;
    entity.totalAmount = domain.totalAmount;
    entity.notes = domain.notes ?? '';
    entity.lines =
      domain.lines.map((line) => {
        const lineEntity = new PurchaseOrderLineTypeOrmEntity();
        lineEntity.id = line.id;
        lineEntity.purchaseOrderId = line.purchaseOrderId ?? entity.id;
        lineEntity.itemId = line.itemId;
        lineEntity.itemName = line.itemName;
        lineEntity.quantity = line.quantity;
        lineEntity.uom = line.uom;
        lineEntity.unitCost = line.unitCost;
        lineEntity.totalCost = line.totalCost;
        return lineEntity;
      }) ?? [];
    return entity;
  }

  async findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { poNumber: orderNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastOrderNumber(prefix: string): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('po')
      .select('po.poNumber', 'poNumber')
      .where('po.poNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.poNumber', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.poNumber ?? null;
  }
}
