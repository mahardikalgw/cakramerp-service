import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { SalesServicePort } from '../ports/sales-service.port';
import { SALES_ORDER_REPOSITORY } from '../../domain/repositories/sales-order-repository.port';
import type { SalesOrderRepositoryPort } from '../../domain/repositories/sales-order-repository.port';
import { CreateSalesOrderCommand } from '../commands/create-sales-order.command';
import { SalesOrder } from '../../domain/entities/sales-order.entity';
import { SalesOrderLine } from '../../domain/entities/sales-order-line.entity';

@Injectable()
export class SalesService implements SalesServicePort {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY)
    private readonly salesOrderRepo: SalesOrderRepositoryPort,
  ) {}

  async createSalesOrder(
    command: CreateSalesOrderCommand,
  ): Promise<SalesOrder> {
    const soNumber = await this.generateSalesOrderNumber();
    const existing = await this.salesOrderRepo.findBySoNumber(soNumber);
    if (existing) {
      throw new ConflictException('Sales order already exists');
    }

    const lines = command.lines.map(
      (line) =>
        new SalesOrderLine({
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: line.quantity,
          uom: line.uom,
          unitPrice: line.unitPrice,
          amount: line.quantity * line.unitPrice,
        }),
    );

    const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);

    const salesOrder = new SalesOrder({
      soNumber,
      customerId: command.customerId,
      customerName: command.customerName,
      status: 'draft',
      orderDate: new Date(command.orderDate),
      expectedDeliveryDate: command.expectedDeliveryDate
        ? new Date(command.expectedDeliveryDate)
        : null,
      notes: command.notes ?? null,
      totalAmount,
      grandTotal: totalAmount,
      lines,
    });

    return this.salesOrderRepo.save(salesOrder);
  }

  private async generateSalesOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const lastNumber = await this.salesOrderRepo.getLastSoNumber(prefix);

    if (!lastNumber) return `${prefix}0001`;
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findSalesOrderById(id: string): Promise<SalesOrder | null> {
    return this.salesOrderRepo.findById(id);
  }

  async findSalesOrders(options?: { page?: number; limit?: number }): Promise<{
    data: SalesOrder[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.salesOrderRepo.findAll({
      page: options?.page,
      limit: options?.limit,
    });
  }
}
