import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common'
import { SUPPLIER_REPOSITORY } from '../../domain/repositories/supplier-repository.port'
import type { SupplierRepositoryPort } from '../../domain/repositories/supplier-repository.port'
import { Supplier } from '../../domain/entities/supplier.entity'
import { CreateSupplierCommand } from '../commands/create-supplier.command'
import { UpdateSupplierCommand } from '../commands/update-supplier.command'
import { SupplierServicePort } from '../ports/supplier-service.port'

@Injectable()
export class SupplierService implements SupplierServicePort {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly repo: SupplierRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: Supplier[]; total: number }> {
    return this.repo.findAll(filters)
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.repo.findById(id)
  }

  async create(command: CreateSupplierCommand): Promise<Supplier> {
    const existing = await this.repo.findByName(command.name)
    if (existing) {
      throw new ConflictException('Supplier with this name already exists')
    }

    const entity = this.repo.create({
      name: command.name,
      email: command.email,
      phone: command.phone,
      address: command.address,
      city: command.city,
      contactPerson: command.contactPerson,
      taxId: command.taxId,
      bankAccount: command.bankAccount,
      bankName: command.bankName,
      notes: command.notes,
      status: 'active',
    })

    return this.repo.save(entity)
  }

  async update(id: string, command: UpdateSupplierCommand): Promise<Supplier> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Supplier not found')

    if (command.name !== undefined) entity.name = command.name
    if (command.email !== undefined) entity.email = command.email
    if (command.phone !== undefined) entity.phone = command.phone
    if (command.address !== undefined) entity.address = command.address
    if (command.city !== undefined) entity.city = command.city
    if (command.contactPerson !== undefined) entity.contactPerson = command.contactPerson
    if (command.taxId !== undefined) entity.taxId = command.taxId
    if (command.bankAccount !== undefined) entity.bankAccount = command.bankAccount
    if (command.bankName !== undefined) entity.bankName = command.bankName
    if (command.notes !== undefined) entity.notes = command.notes
    if (command.status !== undefined) entity.status = command.status as 'active' | 'inactive'

    return this.repo.save(entity)
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new NotFoundException('Supplier not found')
    await this.repo.delete(id)
  }
}