import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../../domain/entities/purchase-order-line.entity';
import { PurchaseOrderTypeOrmEntity } from '../entities/purchase-order-typeorm.entity';
import { PurchaseOrderLineTypeOrmEntity } from '../entities/purchase-order-line-typeorm.entity';
import { PurchaseOrderRepositoryPort } from '../../domain/repositories/purchase-order-repository.port';
import {
  SequenceGenerator,
  ADVISORY_LOCK_KEYS,
} from '../../../../shared/kernel/infrastructure/database/sequence-generator';

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

  async findById(id: string): Promise<PurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() } as any,
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<{
    data: PurchaseOrder[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const skip = (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      where: { deletedAt: IsNull() } as any,
      take: limit,
      skip,
      order: { orderDate: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);
    return {
      data: entities.map((e) => this.toDomain(e)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { poNumber: orderNumber, deletedAt: IsNull() },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastOrderNumber(prefix: string): Promise<string | null> {
    const row = await this.repository
      .createQueryBuilder('po')
      .select('po.poNumber', 'poNumber')
      .where('po.poNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy(
        "CAST(SUBSTRING(po.order_number FROM 'PO-\\d{4}-(\\d+)') AS INTEGER)",
        'DESC',
      )
      .limit(1)
      .getRawOne();
    return row?.poNumber ?? null;
  }

  /**
   * Atomically generates the next PO-NNNN number using a PostgreSQL
   * advisory lock + numeric sort.
   */
  async generateNextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = new SequenceGenerator(this.dataSource, {
      prefix: `PO-${year}-`,
      padLength: 4,
      lockKey: ADVISORY_LOCK_KEYS.PURCHASE_ORDER,
    });
    return seq.next('order_number', 'purchase_orders');
  }
}
