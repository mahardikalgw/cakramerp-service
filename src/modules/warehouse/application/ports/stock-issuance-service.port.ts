export const STOCK_ISSUANCE_SERVICE = Symbol('STOCK_ISSUANCE_SERVICE')

export interface StockIssuanceServicePort {
  create(dto: any, userId: string): Promise<any>
  reverse(id: string, reason: string, userId: string): Promise<any>
  findAll(filters?: {
    warehouseId?: string
    destinationType?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
}
