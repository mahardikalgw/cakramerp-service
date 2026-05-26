export const SUPPLIER_SERVICE = Symbol('SUPPLIER_SERVICE')

export interface SupplierServicePort {
  findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: import('../../domain/entities/supplier.entity').Supplier[]; total: number }>
  findById(id: string): Promise<import('../../domain/entities/supplier.entity').Supplier | null>
  create(command: import('../commands/create-supplier.command').CreateSupplierCommand): Promise<import('../../domain/entities/supplier.entity').Supplier>
  update(id: string, command: import('../commands/update-supplier.command').UpdateSupplierCommand): Promise<import('../../domain/entities/supplier.entity').Supplier>
  delete(id: string): Promise<void>
}