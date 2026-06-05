import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  LabPurchaseOrder,
  LabPurchaseOrderLine,
} from '../../domain/entities/lab-purchase-order.entity';
import { LabPurchaseOrderTypeOrmEntity } from '../entities/lab-purchase-order-typeorm.entity';
import { LabPurchaseOrderLineTypeOrmEntity } from '../entities/lab-purchase-order-line-typeorm.entity';
import { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';

@Injectable()
export class LabPurchaseOrderTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    LabPurchaseOrder,
    LabPurchaseOrderTypeOrmEntity
  >
  implements LabPurchaseOrderRepositoryPort
{
  protected readonly repository: Repository<LabPurchaseOrderTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LabPurchaseOrderTypeOrmEntity);
  }

  toDomain(entity: LabPurchaseOrderTypeOrmEntity): LabPurchaseOrder {
    return new LabPurchaseOrder({
      id: entity.id,
      poNumber: entity.poNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      totalAmount: Number(entity.totalAmount),
      sampleQuantity: entity.sampleQuantity,
      status: entity.status as LabPurchaseOrder['status'],
      createdBy: entity.createdBy,
      signedBy: entity.signedBy,
      signedAt: entity.signedAt,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new LabPurchaseOrderLine({
                id: line.id,
                labPurchaseOrderId: line.labPurchaseOrderId,
                testingServiceId: line.testingServiceId,
                serviceName: line.serviceName,
                quantity: line.quantity,
                unitPrice: Number(line.unitPrice),
                total: Number(line.total),
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: LabPurchaseOrder): LabPurchaseOrderTypeOrmEntity {
    const entity = new LabPurchaseOrderTypeOrmEntity();
    entity.id = domain.id;
    entity.poNumber = domain.poNumber;
    entity.customerId = domain.customerId ?? '';
    entity.customerName = domain.customerName ?? '';
    entity.totalAmount = domain.totalAmount;
    entity.sampleQuantity = domain.sampleQuantity ?? 0;
    entity.status = domain.status ?? 'draft';
    entity.createdBy = domain.createdBy ?? '';
    entity.signedBy = domain.signedBy ?? '';
    entity.signedAt = domain.signedAt ? new Date(domain.signedAt) : new Date();
    entity.lines =
      domain.lines?.map((line) => {
        const lineEntity = new LabPurchaseOrderLineTypeOrmEntity();
        lineEntity.id = line.id;
        lineEntity.labPurchaseOrderId = line.labPurchaseOrderId ?? '';
        lineEntity.testingServiceId = line.testingServiceId;
        lineEntity.serviceName = line.serviceName;
        lineEntity.quantity = line.quantity;
        lineEntity.unitPrice = line.unitPrice;
        lineEntity.total = line.total;
        return lineEntity;
      }) ?? [];
    return entity;
  }

  async findByPONumber(poNumber: string): Promise<LabPurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { poNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastPONumber(): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('lpo')
      .select('lpo.po_number', 'poNumber')
      .orderBy('lpo.po_number', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.poNumber ?? null;
  }
}
