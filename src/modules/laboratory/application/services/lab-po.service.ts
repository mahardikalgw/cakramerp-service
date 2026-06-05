import { Injectable, Inject } from '@nestjs/common';
import { LabPurchaseOrder } from '../../domain/entities/lab-purchase-order.entity';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';

@Injectable()
export class LabPOService {
  constructor(
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly repository: LabPurchaseOrderRepositoryPort,
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
    sampleQuantity?: number;
    lines?: any[];
  }): Promise<LabPurchaseOrder> {
    const lastNumber = await this.getLastPONumber();
    const poNumber = this.generatePONumber(lastNumber);

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
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
