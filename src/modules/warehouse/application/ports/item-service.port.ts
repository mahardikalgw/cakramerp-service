export const ITEM_SERVICE = Symbol('ITEM_SERVICE')

export interface ItemResponseDto {
  id: string
  code: string
  name: string
  category: string
  uom: string
  minStockLevel: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ItemServicePort {
  findAll(filters?: {
    search?: string
    category?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: ItemResponseDto[]; total: number }>
  findById(id: string): Promise<ItemResponseDto | null>
  create(command: import('../commands/create-item.command').CreateItemCommand): Promise<ItemResponseDto>
  update(id: string, command: import('../commands/update-item.command').UpdateItemCommand): Promise<ItemResponseDto>
  delete(id: string): Promise<void>
}