export const ITEM_REPOSITORY = Symbol('ITEM_REPOSITORY')

export interface ItemRepositoryPort {
  findAll(filters?: {
    search?: string
    category?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
  findByCode(code: string): Promise<any | null>
  save(entity: any): Promise<any>
  create(data: any): any
  delete(id: string): Promise<void>
}
