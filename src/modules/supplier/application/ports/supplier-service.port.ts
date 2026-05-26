export const SUPPLIER_SERVICE = Symbol('SUPPLIER_SERVICE')

export interface SupplierResponseDto {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  bankAccount?: string
  bankName?: string
  notes?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface SupplierServicePort {
  findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: SupplierResponseDto[]; total: number }>
  findById(id: string): Promise<SupplierResponseDto | null>
  create(dto: CreateSupplierDto): Promise<SupplierResponseDto>
  update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto>
  delete(id: string): Promise<void>
}

export interface CreateSupplierDto {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  bankAccount?: string
  bankName?: string
  notes?: string
}

export interface UpdateSupplierDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  bankAccount?: string
  bankName?: string
  notes?: string
  status?: string
}
