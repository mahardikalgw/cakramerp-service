export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY')

export interface CustomerRepositoryPort {
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
