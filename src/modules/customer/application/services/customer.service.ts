import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer-repository.port'
import type { CustomerRepositoryPort } from '../../domain/repositories/customer-repository.port'
import type {
  CustomerServicePort,
  CustomerResponseDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../ports/customer-service.port'

@Injectable()
export class CustomerService implements CustomerServicePort {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repo: CustomerRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: CustomerResponseDto[]; total: number }> {
    const { data, total } = await this.repo.findAll(filters)
    return { data: data.map(this.toResponse), total }
  }

  async findById(id: string): Promise<CustomerResponseDto | null> {
    const entity = await this.repo.findById(id)
    return entity ? this.toResponse(entity) : null
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const existing = await this.repo.findByName(dto.name)
    if (existing) {
      throw new ConflictException('Customer with this name already exists')
    }

    const entity = this.repo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      contactPerson: dto.contactPerson,
      taxId: dto.taxId,
      notes: dto.notes,
      status: 'active',
    })

    const saved = await this.repo.save(entity)
    return this.toResponse(saved)
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Customer not found')

    if (dto.name !== undefined) entity.name = dto.name
    if (dto.email !== undefined) entity.email = dto.email
    if (dto.phone !== undefined) entity.phone = dto.phone
    if (dto.address !== undefined) entity.address = dto.address
    if (dto.city !== undefined) entity.city = dto.city
    if (dto.contactPerson !== undefined) entity.contactPerson = dto.contactPerson
    if (dto.taxId !== undefined) entity.taxId = dto.taxId
    if (dto.notes !== undefined) entity.notes = dto.notes
    if (dto.status !== undefined) entity.status = dto.status

    const saved = await this.repo.save(entity)
    return this.toResponse(saved)
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Customer not found')
    await this.repo.delete(id)
  }

  private toResponse(entity: any): CustomerResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email ?? undefined,
      phone: entity.phone ?? undefined,
      address: entity.address ?? undefined,
      city: entity.city ?? undefined,
      contactPerson: entity.contactPerson ?? undefined,
      taxId: entity.taxId ?? undefined,
      notes: entity.notes ?? undefined,
      status: entity.status,
      createdAt: entity.createdAt?.toISOString?.() ?? String(entity.createdAt),
      updatedAt: entity.updatedAt?.toISOString?.() ?? String(entity.updatedAt),
    }
  }
}
