import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { STOCK_OPNAME_REPOSITORY } from '../../domain/repositories/stock-opname-repository.port';
import type { StockOpnameRepositoryPort } from '../../domain/repositories/stock-opname-repository.port';
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port';
import type { StockMovementServicePort } from '../ports/stock-movement-service.port';
import type { StockOpnameServicePort } from '../ports/stock-opname-service.port';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../../../finance/application/ports/gl-posting-queue-service.port';

@Injectable()
export class StockOpnameService implements StockOpnameServicePort {
  constructor(
    @Inject(STOCK_OPNAME_REPOSITORY)
    private readonly stockOpnameRepo: StockOpnameRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
    private readonly dataSource: DataSource,
  ) {}

  async create(warehouseId: string, userId: string): Promise<any> {
    // Get balances for warehouse (validates warehouse exists via repo)
    const balances =
      await this.stockOpnameRepo.getBalancesForWarehouse(warehouseId);

    const savedSession = await this.stockOpnameRepo.createSession({
      warehouseId,
      conductedBy: userId,
      status: 'draft',
    });

    const lines: any[] = [];
    for (const balance of balances) {
      const savedLine = await this.stockOpnameRepo.createLine({
        sessionId: savedSession.id,
        itemId: balance.itemId,
        itemName: balance.itemName,
        systemQty: balance.quantity,
        actualQty: 0,
        varianceQty: 0,
        uom: balance.uom,
      });

      lines.push(savedLine);
    }

    return { session: savedSession, lines };
  }

  async updateCounts(
    sessionId: string,
    lines: { itemId: string; actualQty: number }[],
  ): Promise<any[]> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId);
    if (!session)
      throw new BadRequestException('Stock opname session not found');
    if (session.status !== 'draft') {
      throw new BadRequestException(
        'Can only update counts for draft sessions',
      );
    }

    const updatedLines: any[] = [];

    for (const input of lines) {
      const line = await this.stockOpnameRepo.findLineBySessionAndItem(
        sessionId,
        input.itemId,
      );
      if (!line) {
        throw new BadRequestException(
          `Item ${input.itemId} not found in session`,
        );
      }

      const updatedLine = await this.stockOpnameRepo.updateLine(line.id!, {
        actualQty: input.actualQty,
        varianceQty: input.actualQty - Number(line.systemQty ?? 0),
      });

      updatedLines.push(updatedLine);
    }

    return updatedLines;
  }

  async submit(sessionId: string): Promise<any> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId);
    if (!session)
      throw new BadRequestException('Stock opname session not found');
    if (session.status !== 'draft') {
      throw new BadRequestException('Only draft sessions can be submitted');
    }

    return this.stockOpnameRepo.updateSession(sessionId, {
      status: 'pending_approval',
      submittedAt: new Date(),
    });
  }

  async approve(sessionId: string, userId: string): Promise<any> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId);
    if (!session)
      throw new BadRequestException('Stock opname session not found');
    if (session.status !== 'pending_approval') {
      throw new BadRequestException('Only pending sessions can be approved');
    }

    // Apply adjustments for lines with variance
    const lines = await this.stockOpnameRepo.findLinesBySessionId(sessionId);
    let totalSurplusAmount = 0;
    let totalShortageAmount = 0;

    for (const line of lines) {
      const variance = Number(line.varianceQty);
      if (variance !== 0) {
        await this.stockMovementService.recordMovement({
          itemId: line.itemId,
          warehouseId: session.warehouseId,
          movementType: 'adjustment',
          quantity: variance,
          referenceType: 'stock_opname',
          referenceId: sessionId,
          description: `Stock opname adjustment - ${line.itemName} (variance: ${variance})`,
          createdBy: userId,
        });

        // Look up unit cost for adjustment amount
        const costRows = await this.dataSource.query(
          `SELECT unit_cost FROM item_stock_balances
           WHERE item_id = $1 AND warehouse_id = $2 LIMIT 1`,
          [line.itemId, session.warehouseId],
        );
        const unitCost =
          costRows.length > 0 ? Number(costRows[0].unit_cost ?? 0) : 0;
        const adjustmentAmount = Math.abs(variance) * unitCost;

        if (variance > 0) {
          totalSurplusAmount += adjustmentAmount;
        } else {
          totalShortageAmount += adjustmentAmount;
        }
      }
    }

    // Create GL Posting Queue entries for adjustments
    // Positive variance (surplus): DR Inventory 1300 / CR Adjustment 5200
    if (totalSurplusAmount > 0) {
      await this.glPostingQueueService.createEntry({
        sourceType: 'stock_opname',
        sourceId: sessionId,
        sourceNumber: sessionId,
        eventType: 'stock_adjusted',
        amount: totalSurplusAmount,
        description: `Stock opname surplus adjustment - Session ${sessionId}`,
        suggestedLines: [
          {
            accountId: '1300',
            accountCode: '1300',
            accountName: 'Inventory',
            debit: totalSurplusAmount,
            credit: 0,
            description: `Inventory increase for stock opname surplus`,
          },
          {
            accountId: '5200',
            accountCode: '5200',
            accountName: 'Adjustment',
            debit: 0,
            credit: totalSurplusAmount,
            description: `Adjustment gain for stock opname surplus`,
          },
        ],
      });
    }

    // Negative variance (shortage): DR Adjustment 5200 / CR Inventory 1300
    if (totalShortageAmount > 0) {
      await this.glPostingQueueService.createEntry({
        sourceType: 'stock_opname',
        sourceId: sessionId,
        sourceNumber: sessionId,
        eventType: 'stock_adjusted',
        amount: totalShortageAmount,
        description: `Stock opname shortage adjustment - Session ${sessionId}`,
        suggestedLines: [
          {
            accountId: '5200',
            accountCode: '5200',
            accountName: 'Adjustment',
            debit: totalShortageAmount,
            credit: 0,
            description: `Adjustment loss for stock opname shortage`,
          },
          {
            accountId: '1300',
            accountCode: '1300',
            accountName: 'Inventory',
            debit: 0,
            credit: totalShortageAmount,
            description: `Inventory decrease for stock opname shortage`,
          },
        ],
      });
    }

    return this.stockOpnameRepo.updateSession(sessionId, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
    });
  }

  async findAll(filters?: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.stockOpnameRepo.findAll(filters);
  }

  async findById(id: string): Promise<any | null> {
    return this.stockOpnameRepo.findById(id);
  }
}
