import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { STOCK_ISSUANCE_REPOSITORY } from '../../domain/repositories/stock-issuance-repository.port';
import type { StockIssuanceRepositoryPort } from '../../domain/repositories/stock-issuance-repository.port';
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port';
import type { StockMovementServicePort } from '../ports/stock-movement-service.port';
import type { StockIssuanceServicePort } from '../ports/stock-issuance-service.port';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../../../finance/application/ports/gl-posting-queue-service.port';

export interface CreateStockIssuanceDto {
  warehouseId: string;
  destinationType: string;
  destinationId: string;
  destinationName: string;
  issuanceDate: string;
  lines: {
    itemId: string;
    itemName: string;
    quantity: number;
    uom: string;
  }[];
}

@Injectable()
export class StockIssuanceService implements StockIssuanceServicePort {
  constructor(
    @Inject(STOCK_ISSUANCE_REPOSITORY)
    private readonly stockIssuanceRepo: StockIssuanceRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateStockIssuanceDto, userId: string): Promise<any> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException(
        'Stock issuance must have at least one line',
      );
    }

    // Validate stock availability for each line
    for (const line of dto.lines) {
      const available = await this.stockMovementService.getStockBalance(
        line.itemId,
        dto.warehouseId,
      );
      if (line.quantity > available) {
        throw new BadRequestException(
          `Insufficient stock for item "${line.itemName}". Available: ${available}, Requested: ${line.quantity}`,
        );
      }
    }

    const issuanceNumber = await this.generateIssuanceNumber();

    const savedIssuance = await this.stockIssuanceRepo.create({
      issuanceNumber,
      warehouseId: dto.warehouseId,
      destinationType: dto.destinationType,
      destinationId: dto.destinationId,
      destinationName: dto.destinationName,
      issuanceDate: new Date(dto.issuanceDate),
      status: 'confirmed',
      createdBy: userId,
    });

    const lines: any[] = [];
    let totalIssuanceAmount = 0;

    for (const line of dto.lines) {
      const savedLine = await this.stockIssuanceRepo.createLine({
        issuanceId: savedIssuance.id,
        itemId: line.itemId,
        itemName: line.itemName,
        quantity: line.quantity,
        uom: line.uom,
      });

      // Look up unit cost from item_stock_balances
      const costRows = await this.dataSource.query(
        `SELECT unit_cost FROM item_stock_balances
         WHERE item_id = $1 AND warehouse_id = $2 LIMIT 1`,
        [line.itemId, dto.warehouseId],
      );
      const unitCost =
        costRows.length > 0 ? Number(costRows[0].unit_cost ?? 0) : 0;
      const totalCost = unitCost * line.quantity;
      totalIssuanceAmount += totalCost;

      lines.push({ ...savedLine, unitCost, totalCost });

      // Record stock movement (negative quantity for issuance)
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: dto.warehouseId,
        movementType: 'issuance',
        quantity: -line.quantity,
        referenceType: 'stock_issuance',
        referenceId: savedIssuance.id,
        description: `ISS ${issuanceNumber} - ${line.itemName} to ${dto.destinationName}`,
        createdBy: userId,
      });
    }

    // Create GL Posting Queue entry (DR COGS 5100 / CR Inventory 1300)
    if (totalIssuanceAmount > 0) {
      await this.glPostingQueueService.createEntry({
        sourceType: 'stock_issuance',
        sourceId: savedIssuance.id!,
        sourceNumber: issuanceNumber,
        eventType: 'stock_issued',
        amount: totalIssuanceAmount,
        description: `Stock Issuance ${issuanceNumber} - ${dto.destinationName}`,
        suggestedLines: [
          {
            accountId: '5100',
            accountCode: '5100',
            accountName: 'COGS',
            debit: totalIssuanceAmount,
            credit: 0,
            description: `COGS for issuance ${issuanceNumber}`,
          },
          {
            accountId: '1300',
            accountCode: '1300',
            accountName: 'Inventory',
            debit: 0,
            credit: totalIssuanceAmount,
            description: `Inventory reduction for issuance ${issuanceNumber}`,
          },
        ],
      });
    }

    return { issuance: savedIssuance, lines };
  }

  async reverse(id: string, reason: string, userId: string): Promise<any> {
    const result = await this.stockIssuanceRepo.findById(id);
    if (!result) throw new BadRequestException('Stock issuance not found');

    const { issuance, lines } = result;

    if (issuance.status === 'reversed') {
      throw new BadRequestException('Stock issuance is already reversed');
    }

    // Create reversal movements (positive quantity to restore stock)
    for (const line of lines) {
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: issuance.warehouseId,
        movementType: 'issuance_reversal',
        quantity: Number(line.quantity),
        referenceType: 'stock_issuance',
        referenceId: id,
        description: `Reversal of ${issuance.issuanceNumber} - ${line.itemName}. Reason: ${reason}`,
        createdBy: userId,
      });
    }

    // Update issuance status
    return this.stockIssuanceRepo.update(id, {
      status: 'reversed',
      reversalReason: reason,
      reversedAt: new Date(),
    });
  }

  async findAll(filters?: {
    warehouseId?: string;
    destinationType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.stockIssuanceRepo.findAll(filters);
  }

  async findById(id: string): Promise<any | null> {
    return this.stockIssuanceRepo.findById(id);
  }

  private async generateIssuanceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ISS-${year}-`;
    const lastNumber =
      await this.stockIssuanceRepo.getLastIssuanceNumber(prefix);

    if (!lastNumber) return `${prefix}0001`;
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
