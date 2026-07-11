import { Injectable, Inject } from '@nestjs/common';
import { LabPurchaseOrder } from '../../domain/entities/lab-purchase-order.entity';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LabPurchasingAdapter } from '../adapters/lab-purchasing.adapter';

@Injectable()
export class LabPOService {
  constructor(
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly repository: LabPurchaseOrderRepositoryPort,
    private readonly purchasingAdapter: LabPurchasingAdapter,
  ) {}

  async findAll(options?: {
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.customerId) filters.customerId = options.customerId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<LabPurchaseOrder | null> {
    return this.repository.findById(id);
  }

  async findByPONumber(poNumber: string): Promise<LabPurchaseOrder | null> {
    return this.repository.findByPONumber(poNumber);
  }

  private generatePONumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/LPO-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `LPO-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async getLastPONumber(): Promise<string | null> {
    return this.repository.getLastPONumber();
  }

  async create(dto: {
    customerId: string;
    customerName: string;
    totalAmount?: number;
    purchaseOrderId?: string | null;
    sampleQuantity?: number;
    lines?: any[];
  }): Promise<LabPurchaseOrder> {
    // generateNextPONumber() atomically picks the next free PO number
    // under a PostgreSQL advisory lock.
    const poNumber = await this.repository.generateNextPONumber();

    const entity = new LabPurchaseOrder({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      poNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      totalAmount: dto.totalAmount,
      sampleQuantity: dto.sampleQuantity,
      status: 'draft',
      purchaseOrderId: dto.purchaseOrderId ?? null,
      lines: [],
    } as any);

    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: {
      customerName?: string;
      totalAmount?: number;
      status?: string;
    },
  ): Promise<LabPurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Purchase order not found');
    }

    Object.assign(existing, dto);
    return this.repository.save(existing);
  }

  async sign(id: string, userId: string): Promise<LabPurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Purchase order not found');
    }
    existing.status = 'signed';
    existing.signedBy = userId;
    existing.signedAt = new Date();
    const saved = await this.repository.save(existing);
    if (!existing.purchaseOrderId && saved.purchaseOrderId) {
      await this.purchasingAdapter.linkToPurchaseOrder(
        id,
        saved.purchaseOrderId,
      );
    }
    return saved;
  }

  async recordPayment(id: string, userId: string): Promise<LabPurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Purchase order not found');
    if (existing.status !== 'signed')
      throw new Error('Only signed purchase orders can record payment');
    existing.status = 'paid';
    return this.repository.save(existing);
  }

  async activate(id: string): Promise<LabPurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Purchase order not found');
    if (existing.status !== 'paid')
      throw new Error('Only paid purchase orders can be activated');
    existing.status = 'active';
    return this.repository.save(existing);
  }

  async close(id: string): Promise<LabPurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Purchase order not found');
    if (existing.status !== 'active')
      throw new Error('Only active purchase orders can be closed');
    existing.status = 'closed';
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
