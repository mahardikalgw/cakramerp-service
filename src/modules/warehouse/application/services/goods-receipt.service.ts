import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GOODS_RECEIPT_REPOSITORY } from '../../domain/repositories/goods-receipt-repository.port';
import type { GoodsReceiptRepositoryPort } from '../../domain/repositories/goods-receipt-repository.port';
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port';
import type { StockMovementServicePort } from '../ports/stock-movement-service.port';
import type { GoodsReceiptServicePort } from '../ports/goods-receipt-service.port';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';

export interface CreateGoodsReceiptDto {
  poId?: string;
  warehouseId: string;
  supplierId?: string;
  vendorName: string;
  receivedDate: string;
  notes?: string;
  lines: {
    itemId: string;
    itemName: string;
    poQty: number;
    receivedQty: number;
    uom: string;
    unitCost?: number;
    remarks?: string;
  }[];
}

@Injectable()
export class GoodsReceiptService implements GoodsReceiptServicePort {
  constructor(
    @Inject(GOODS_RECEIPT_REPOSITORY)
    private readonly goodsReceiptRepo: GoodsReceiptRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateGoodsReceiptDto, userId: string): Promise<any> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException(
        'Goods receipt must have at least one line',
      );
    }

    const grnNumber = await this.generateGrnNumber();

    const savedReceipt = await this.goodsReceiptRepo.create({
      grnNumber,
      poId: dto.poId,
      warehouseId: dto.warehouseId,
      supplierId: dto.supplierId,
      vendorName: dto.vendorName,
      receivedDate: new Date(dto.receivedDate),
      notes: dto.notes,
      status: 'confirmed',
      createdBy: userId,
    });

    const lines: any[] = [];
    let totalGrnAmount = 0;

    for (const line of dto.lines) {
      const discrepancyQty = line.poQty - line.receivedQty;
      const unitCost = line.unitCost ?? 0;
      const totalCost = unitCost * line.receivedQty;

      const savedLine = await this.goodsReceiptRepo.createLine({
        goodsReceiptId: savedReceipt.id,
        itemId: line.itemId,
        itemName: line.itemName,
        poQty: line.poQty,
        receivedQty: line.receivedQty,
        discrepancyQty,
        uom: line.uom,
        remarks: line.remarks,
      });

      lines.push({ ...savedLine, unitCost, totalCost });
      totalGrnAmount += totalCost;

      // Record stock movement for each line
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: dto.warehouseId,
        movementType: 'receipt',
        quantity: line.receivedQty,
        referenceType: 'goods_receipt',
        referenceId: savedReceipt.id,
        description: `GRN ${grnNumber} - ${line.itemName}`,
        createdBy: userId,
      });

      // Update weighted average cost in item_stock_balances
      if (unitCost > 0) {
        await this.updateWeightedAverageCost(
          line.itemId,
          dto.warehouseId,
          line.receivedQty,
          unitCost,
        );
      }
    }

    // Create GL Posting Queue entry (DR Inventory 1300 / CR GRNI 1310)
    if (totalGrnAmount > 0) {
      await this.glPostingQueue.createEntry({
        sourceType: 'goods_receipt',
        sourceId: savedReceipt.id!,
        sourceNumber: grnNumber,
        eventType: 'grn_received',
        amount: totalGrnAmount,
        description: `Goods Receipt ${grnNumber} - ${dto.vendorName}`,
        suggestedLines: [
          {
            accountId: '1300',
            accountCode: '1300',
            accountName: 'Inventory',
            debit: totalGrnAmount,
            credit: 0,
            description: `Inventory received via GRN ${grnNumber}`,
          },
          {
            accountId: '1310',
            accountCode: '1310',
            accountName: 'GRNI',
            debit: 0,
            credit: totalGrnAmount,
            description: `GRNI cleared for GRN ${grnNumber}`,
          },
        ],
      });
    }

    return { receipt: savedReceipt, lines };
  }

  async findAll(filters?: {
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.goodsReceiptRepo.findAll(filters);
  }

  async findById(id: string): Promise<any | null> {
    return this.goodsReceiptRepo.findById(id);
  }

  private async updateWeightedAverageCost(
    itemId: string,
    warehouseId: string,
    receivedQty: number,
    unitCost: number,
  ): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT quantity, unit_cost FROM item_stock_balances
       WHERE item_id = $1 AND warehouse_id = $2 LIMIT 1`,
      [itemId, warehouseId],
    );

    if (rows.length > 0) {
      const currentQty = Number(rows[0].quantity);
      const currentCost = Number(rows[0].unit_cost ?? 0);
      const newTotalQty = currentQty + receivedQty;
      const newWeightedCost =
        newTotalQty > 0
          ? (currentCost * currentQty + unitCost * receivedQty) / newTotalQty
          : unitCost;

      await this.dataSource.query(
        `UPDATE item_stock_balances SET unit_cost = $1, updated_at = NOW()
         WHERE item_id = $2 AND warehouse_id = $3`,
        [newWeightedCost, itemId, warehouseId],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO item_stock_balances (item_id, warehouse_id, quantity, unit_cost)
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (item_id, warehouse_id) DO UPDATE SET unit_cost = $3`,
        [itemId, warehouseId, unitCost],
      );
    }
  }

  private async generateGrnNumber(): Promise<string> {
    return this.goodsReceiptRepo.generateNextGrnNumber();
  }
}
