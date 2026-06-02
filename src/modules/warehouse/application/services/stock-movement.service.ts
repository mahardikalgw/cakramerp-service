import { Injectable, Inject } from '@nestjs/common';
import { STOCK_MOVEMENT_REPOSITORY } from '../../domain/repositories/stock-movement-repository.port';
import type { StockMovementRepositoryPort } from '../../domain/repositories/stock-movement-repository.port';
import type { StockMovementServicePort } from '../ports/stock-movement-service.port';

export interface RecordMovementDto {
  itemId: string;
  warehouseId: string;
  movementType: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdBy: string;
}

@Injectable()
export class StockMovementService implements StockMovementServicePort {
  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepo: StockMovementRepositoryPort,
  ) {}

  async recordMovement(dto: RecordMovementDto): Promise<any> {
    // Get current balance
    const currentBalance = await this.stockMovementRepo.getBalance(
      dto.itemId,
      dto.warehouseId,
    );
    const newBalance = currentBalance + dto.quantity;

    // Update balance
    await this.stockMovementRepo.upsertBalance(
      dto.itemId,
      dto.warehouseId,
      dto.quantity,
    );

    // Create ledger entry
    return this.stockMovementRepo.createLedgerEntry({
      ...dto,
      balanceAfter: newBalance,
    });
  }

  async getStockBalance(itemId: string, warehouseId: string): Promise<number> {
    return this.stockMovementRepo.getBalance(itemId, warehouseId);
  }

  async getStockBalances(filters?: {
    warehouseId?: string;
    category?: string;
    belowMinimum?: boolean;
  }): Promise<any[]> {
    return this.stockMovementRepo.getBalances(filters);
  }

  async getStockCard(itemId: string): Promise<any[]> {
    return this.stockMovementRepo.getStockCard(itemId);
  }
}
