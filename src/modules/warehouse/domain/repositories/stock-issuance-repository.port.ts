import { StockIssuance } from '../entities/stock-issuance.entity'
import { StockIssuanceLine } from '../entities/stock-issuance-line.entity'

export const STOCK_ISSUANCE_REPOSITORY = Symbol('STOCK_ISSUANCE_REPOSITORY')

export interface StockIssuanceRepositoryPort {
  create(issuance: Partial<StockIssuance>): Promise<StockIssuance>
  createLine(line: Partial<StockIssuanceLine>): Promise<StockIssuanceLine>
  findAll(filters?: {
    warehouseId?: string
    destinationType?: string
    page?: number
    limit?: number
  }): Promise<{ data: StockIssuance[]; total: number }>
  findById(
    id: string,
  ): Promise<{ issuance: StockIssuance; lines: StockIssuanceLine[] } | null>
  findLinesById(issuanceId: string): Promise<StockIssuanceLine[]>
  update(id: string, data: Partial<StockIssuance>): Promise<StockIssuance>
  getLastIssuanceNumber(prefix: string): Promise<string | null>
}
