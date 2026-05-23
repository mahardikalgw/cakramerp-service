export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY')

export interface StockMovementRepositoryPort {
  getBalance(itemId: string, warehouseId: string): Promise<number>
  getBalances(filters?: {
    warehouseId?: string
    category?: string
    belowMinimum?: boolean
  }): Promise<any[]>
  getStockCard(itemId: string): Promise<any[]>
  upsertBalance(
    itemId: string,
    warehouseId: string,
    quantityDelta: number,
  ): Promise<void>
  createLedgerEntry(data: {
    itemId: string
    warehouseId: string
    movementType: string
    quantity: number
    balanceAfter: number
    referenceType?: string
    referenceId?: string
    description?: string
    createdBy: string
  }): Promise<any>
}
