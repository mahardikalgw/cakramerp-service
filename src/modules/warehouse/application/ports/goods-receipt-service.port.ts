export const GOODS_RECEIPT_SERVICE = Symbol('GOODS_RECEIPT_SERVICE')

export interface GoodsReceiptServicePort {
  create(dto: any, userId: string): Promise<any>
  findAll(filters?: {
    warehouseId?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
}
