export const STOCK_MOVEMENT_SERVICE = Symbol('STOCK_MOVEMENT_SERVICE')

export interface StockMovementServicePort {
  recordMovement(dto: {
    itemId: string
    warehouseId: string
    movementType: string
    quantity: number
    referenceType?: string
    referenceId?: string
    description?: string
    createdBy: string
  }): Promise<any>
  getStockBalance(itemId: string, warehouseId: string): Promise<number>
  getStockBalances(filters?: {
    warehouseId?: string
    category?: string
    belowMinimum?: boolean
  }): Promise<any[]>
  getStockCard(itemId: string): Promise<any[]>
}
