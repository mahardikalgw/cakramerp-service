import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LabPurchaseOrder } from '../../domain/entities/lab-purchase-order.entity';
import { PurchaseOrderTypeOrmEntity } from '../../../purchasing/infrastructure/entities/purchase-order-typeorm.entity';
import { PurchaseOrderLineTypeOrmEntity } from '../../../purchasing/infrastructure/entities/purchase-order-line-typeorm.entity';

@Injectable()
export class LabPurchasingAdapter {
  private readonly poRepo: Repository<PurchaseOrderTypeOrmEntity>;
  private readonly poLineRepo: Repository<PurchaseOrderLineTypeOrmEntity>;

  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {
    this.poRepo = dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    this.poLineRepo = dataSource.getRepository(PurchaseOrderLineTypeOrmEntity);
  }

  async createFromLabPO(labPO: LabPurchaseOrder): Promise<string> {
    const poNumber = `LPO-${labPO.poNumber}`;
    const existing = await this.poRepo.findOne({
      where: { poNumber } as any,
    });
    if (existing) return existing.id;

    const po = this.poRepo.create({
      poNumber,
      supplierId: labPO.customerId,
      supplierName: labPO.customerName,
      orderDate: new Date(),
      status: 'draft',
      totalAmount: labPO.totalAmount ?? 0,
      notes: `Source: Lab PO ${labPO.poNumber}`,
      approvedBy: labPO.signedBy,
      approvedAt: labPO.signedAt ?? new Date(),
    });
    const saved = await this.poRepo.save(po);

    if (labPO.lines && labPO.lines.length > 0) {
      const lineEntities = labPO.lines.map((line) =>
        this.poLineRepo.create({
          purchaseOrderId: saved.id,
          itemName: line.serviceName,
          description: `Testing service: ${line.serviceName}`,
          quantity: line.quantity,
          unitCost: line.unitPrice,
          totalCost: line.total,
          lineType: 'service',
          fulfillmentStatus: 'pending',
          receivedQuantity: 0,
          uom: 'pcs',
          taxPercent: 0,
          taxAmount: 0,
          discountAmount: 0,
        }),
      );
      await this.poLineRepo.save(lineEntities);
    }

    return saved.id;
  }

  async linkToPurchaseOrder(
    labPoId: string,
    purchaseOrderId: string,
  ): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE lab_purchase_orders
      SET purchase_order_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [purchaseOrderId, labPoId],
    );
  }
}
