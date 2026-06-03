import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseReturnService } from './purchase-return.service';
import { ProcurementWarehouseAdapter } from '../adapters/procurement-warehouse.adapter';
import { ProcurementFinanceAdapter } from '../adapters/procurement-finance.adapter';

/**
 * Orchestrates cross-module actions triggered from purchasing documents.
 *
 * - Approving a PO enqueues a commitment GL entry.
 * - "Receive" on a PO creates a draft GRN through the warehouse adapter.
 * - "Invoice" on a PO creates a draft AP invoice through the finance adapter.
 * - Approving a purchase return enqueues the GL reversal.
 */
@Injectable()
export class PurchaseOrchestratorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly purchaseReturnService: PurchaseReturnService,
    private readonly warehouseAdapter: ProcurementWarehouseAdapter,
    private readonly financeAdapter: ProcurementFinanceAdapter,
  ) {}

  async approvePO(poId: string, approverId: string) {
    const updated = await this.purchaseOrderService.approve(poId, approverId);
    try {
      await this.financeAdapter.recordPOApprovalGl(poId);
    } catch (err) {
      // Approval is the user-facing action; surface the GL issue but don't undo it.
      console.warn('PO approval GL queue failed', err);
    }
    return updated;
  }

  async rejectPO(poId: string, approverId: string, reason?: string) {
    return this.purchaseOrderService.reject(poId, approverId, reason);
  }

  async receivePO(
    poId: string,
    userId: string,
    warehouseId: string,
  ): Promise<{ goodsReceiptId: string; goodsReceiptNumber: string }> {
    const po: any[] = await this.dataSource.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 LIMIT 1`,
      [poId],
    );
    if (po.length === 0)
      throw new NotFoundException('Purchase order not found');
    if (po[0].status === 'draft' || po[0].status === 'rejected') {
      throw new BadRequestException(
        'Purchase order must be approved before receiving',
      );
    }

    return this.warehouseAdapter.createDraftGoodsReceiptFromPO(
      poId,
      userId,
      warehouseId,
    );
  }

  async invoicePO(
    poId: string,
    userId: string,
    overrides?: { supplierInvoiceNumber?: string; dueDate?: string },
  ) {
    const po: any[] = await this.dataSource.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 LIMIT 1`,
      [poId],
    );
    if (po.length === 0)
      throw new NotFoundException('Purchase order not found');
    if (po[0].status === 'draft' || po[0].status === 'rejected') {
      throw new BadRequestException(
        'Purchase order must be approved before invoicing',
      );
    }

    return this.financeAdapter.createDraftAPInvoiceFromPO(
      poId,
      userId,
      overrides,
    );
  }

  async approvePurchaseReturn(returnId: string, approverId: string) {
    const updated = await this.purchaseReturnService.approve(
      returnId,
      approverId,
    );
    try {
      await this.financeAdapter.recordPurchaseReturnGl(returnId);
    } catch (err) {
      console.warn('Purchase return GL queue failed', err);
    }
    return updated;
  }
}
