import { StockOpnameSession } from '../entities/stock-opname-session.entity'
import { StockOpnameLine } from '../entities/stock-opname-line.entity'

export const STOCK_OPNAME_REPOSITORY = Symbol('STOCK_OPNAME_REPOSITORY')

export interface StockOpnameRepositoryPort {
  createSession(
    session: Partial<StockOpnameSession>,
  ): Promise<StockOpnameSession>
  createLine(line: Partial<StockOpnameLine>): Promise<StockOpnameLine>
  findAll(filters?: {
    warehouseId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: StockOpnameSession[]; total: number }>
  findById(
    id: string,
  ): Promise<{ session: StockOpnameSession; lines: StockOpnameLine[] } | null>
  findSessionById(id: string): Promise<StockOpnameSession | null>
  findLinesBySessionId(sessionId: string): Promise<StockOpnameLine[]>
  findLineBySessionAndItem(
    sessionId: string,
    itemId: string,
  ): Promise<StockOpnameLine | null>
  updateSession(
    id: string,
    data: Partial<StockOpnameSession>,
  ): Promise<StockOpnameSession>
  updateLine(
    id: string,
    data: Partial<StockOpnameLine>,
  ): Promise<StockOpnameLine>
  getBalancesForWarehouse(
    warehouseId: string,
  ): Promise<
    { itemId: string; itemName: string; quantity: number; uom: string }[]
  >
}
