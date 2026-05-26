export const CUSTOMER_SERVICE = Symbol('CUSTOMER_SERVICE')

export interface CustomerResponseDto {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  notes?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CustomerServicePort {
  findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: CustomerResponseDto[]; total: number }>
  findById(id: string): Promise<CustomerResponseDto | null>
  create(dto: CreateCustomerDto): Promise<CustomerResponseDto>
  update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto>
  delete(id: string): Promise<void>
}

export interface CreateCustomerDto {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  notes?: string
}

export interface UpdateCustomerDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  contactPerson?: string
  taxId?: string
  notes?: string
  status?: string
}
