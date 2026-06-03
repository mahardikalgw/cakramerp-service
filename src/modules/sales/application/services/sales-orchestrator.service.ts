import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SalesOrderService } from './sales-order.service';
import { SalesReturnService } from './sales-return.service';
import { SalesWarehouseAdapter } from '../adapters/sales-warehouse.adapter';
import { SalesFinanceAdapter } from '../adapters/sales-finance.adapter';

/**
 * Orchestrates cross-module actions triggered from sales documents.
 *
 * - Approving a SO enqueues a commitment GL entry.
 * - "Deliver" on a SO creates a draft stock issuance through the warehouse adapter.
 * - "Invoice" on a SO creates a draft AR invoice through the finance adapter.
 * - Approving a sales return reverses the issuance and enqueues the GL reversal.
 */
@Injectable()
export class SalesOrchestratorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly salesOrderService: SalesOrderService,
    private readonly salesReturnService: SalesReturnService,
    private readonly warehouseAdapter: SalesWarehouseAdapter,
    private readonly financeAdapter: SalesFinanceAdapter,
  ) {}

  async approveSO(soId: string) {
    const updated = await this.salesOrderService.approve(soId);
    try {
      await this.financeAdapter.recordSOApprovalGl(soId);
    } catch (err) {
      console.warn('SO approval GL queue failed', err);
    }
    return updated;
  }

  async rejectSO(soId: string, reason?: string) {
    return this.salesOrderService.reject(soId, reason);
  }

  async deliverSO(soId: string, userId: string, warehouseId: string) {
    const so: any[] = await this.dataSource.query(
      `SELECT id, status FROM sales_orders WHERE id = $1 LIMIT 1`,
      [soId],
    );
    if (so.length === 0) throw new NotFoundException('Sales order not found');
    if (so[0].status === 'draft' || so[0].status === 'rejected') {
      throw new BadRequestException(
        'Sales order must be approved before delivery',
      );
    }

    return this.warehouseAdapter.createDraftIssuanceFromSO(
      soId,
      userId,
      warehouseId,
    );
  }

  async invoiceSO(
    soId: string,
    userId: string,
    overrides?: { dueDate?: string },
  ) {
    const so: any[] = await this.dataSource.query(
      `SELECT id, status FROM sales_orders WHERE id = $1 LIMIT 1`,
      [soId],
    );
    if (so.length === 0) throw new NotFoundException('Sales order not found');
    if (so[0].status === 'draft' || so[0].status === 'rejected') {
      throw new BadRequestException(
        'Sales order must be approved before invoicing',
      );
    }

    return this.financeAdapter.createDraftARInvoiceFromSO(
      soId,
      userId,
      overrides,
    );
  }

  async approveSalesReturn(
    returnId: string,
    approverId: string,
    reason: string,
  ) {
    const updated = await this.salesReturnService.approve(returnId, approverId);
    try {
      await this.warehouseAdapter.reverseFromSalesReturn(
        returnId,
        approverId,
        reason,
      );
    } catch (err) {
      console.warn('Sales return warehouse reversal failed', err);
    }
    try {
      await this.financeAdapter.recordSalesReturnGl(returnId);
    } catch (err) {
      console.warn('Sales return GL queue failed', err);
    }
    return updated;
  }
}
