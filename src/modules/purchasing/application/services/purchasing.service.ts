import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { PurchasingServicePort } from '../ports/purchasing-service.port';
import { PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/purchase-order-repository.port';
import type { PurchaseOrderRepositoryPort } from '../../domain/repositories/purchase-order-repository.port';
import { CreatePurchaseOrderCommand } from '../commands/create-purchase-order.command';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../../domain/entities/purchase-order-line.entity';

@Injectable()
export class PurchasingService implements PurchasingServicePort {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY)
    private readonly purchaseOrderRepo: PurchaseOrderRepositoryPort,
  ) {}

  async createPurchaseOrder(
    command: CreatePurchaseOrderCommand,
  ): Promise<PurchaseOrder> {
    const orderNumber = await this.generatePurchaseOrderNumber();
    const existing =
      await this.purchaseOrderRepo.findByOrderNumber(orderNumber);
    if (existing) {
      throw new ConflictException('Purchase order already exists');
    }

    const lines = command.lines.map(
      (line) =>
        new PurchaseOrderLine({
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: line.quantity,
          uom: line.uom,
          unitCost: line.unitCost,
          totalCost: line.quantity * line.unitCost,
        }),
    );

    const totalAmount = lines.reduce((sum, line) => sum + line.totalCost, 0);

    const purchaseOrder = new PurchaseOrder({
      orderNumber,
      supplierId: command.supplierId,
      supplierName: command.supplierName,
      status: 'draft',
      orderDate: new Date(command.orderDate),
      expectedDate: command.expectedDate
        ? new Date(command.expectedDate)
        : null,
      notes: command.notes ?? null,
      totalAmount,
      lines,
    });

    return this.purchaseOrderRepo.save(purchaseOrder);
  }

  private async generatePurchaseOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const lastNumber = await this.purchaseOrderRepo.getLastOrderNumber(prefix);

    if (!lastNumber) return `${prefix}0001`;
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    return this.purchaseOrderRepo.findById(id);
  }

  async findPurchaseOrders(options?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: PurchaseOrder[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.purchaseOrderRepo.findAll({
      page: options?.page,
      limit: options?.limit,
    });
  }
}
