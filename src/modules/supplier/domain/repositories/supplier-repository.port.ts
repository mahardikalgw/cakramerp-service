export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY')

export interface SupplierRepositoryPort {
  findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
  findByName(name: string): Promise<any | null>
  save(entity: any): Promise<any>
  create(data: any): any
  delete(id: string): Promise<void>
}
