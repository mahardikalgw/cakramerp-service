import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import {
  LabPurchaseOrder,
  LabPurchaseOrderLine,
} from '../../domain/entities/lab-purchase-order.entity';
import { LabPurchaseOrderTypeOrmEntity } from '../entities/lab-purchase-order-typeorm.entity';
import { LabPurchaseOrderLineTypeOrmEntity } from '../entities/lab-purchase-order-line-typeorm.entity';
import { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';

@Injectable()
export class LabPurchaseOrderTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
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
      purchaseOrderId: entity.purchaseOrderId ?? null,
      documentUrl: entity.documentUrl ?? null,
    });
  }

  toEntity(domain: LabPurchaseOrder): LabPurchaseOrderTypeOrmEntity {
    const entity = new LabPurchaseOrderTypeOrmEntity();
    entity.id = domain.id;
    entity.poNumber = domain.poNumber;
    entity.customerId = domain.customerId || (null as any);
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
        lineEntity.labPurchaseOrderId =
          line.labPurchaseOrderId || (null as any);
        lineEntity.testingServiceId = line.testingServiceId;
        lineEntity.serviceName = line.serviceName;
        lineEntity.quantity = line.quantity;
        lineEntity.unitPrice = line.unitPrice;
        lineEntity.total = line.total;
        return lineEntity;
      }) ?? [];
    entity.purchaseOrderId = domain.purchaseOrderId ?? (null as any);
    entity.documentUrl = domain.documentUrl ?? null;
    return entity;
  }

  async findById(id: string): Promise<LabPurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPONumber(poNumber: string): Promise<LabPurchaseOrder | null> {
    const entity = await this.repository.findOne({
      where: { poNumber, deletedAt: IsNull() },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Returns the last PO number by extracting the numeric suffix and
   * sorting by integer value, not by string.
   *
   * String sort of `LPO-YYYY-NNNNN` misorders `00009 > 00010`, which causes
   * the sequence generator to produce duplicate PO numbers.
   *
   * NOTE: explicitly includes soft-deleted records so the sequence is
   * not reused, which would violate the unique constraint.
   */
  async getLastPONumber(): Promise<string | null> {
    const year = new Date().getFullYear();
    const rows: { max_seq: number | null }[] = await this.dataSource.query(
      `SELECT MAX(
          CAST(
            SUBSTRING(po_number FROM 'LPO-\\d{4}-(\\d+)')
            AS INTEGER
          )
        ) AS max_seq
        FROM lab_purchase_orders
        WHERE po_number ~ $1`,
      [`^LPO-${year}-`],
    );

    const maxSeq = rows[0]?.max_seq ?? null;
    if (maxSeq !== null) {
      return `LPO-${year}-${String(maxSeq).padStart(5, '0')}`;
    }
    return null;
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
