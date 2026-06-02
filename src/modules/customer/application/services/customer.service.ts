import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CUSTOMER_REPOSITORY } from '../../domain/repositories/customer-repository.port';
import type { CustomerRepositoryPort } from '../../domain/repositories/customer-repository.port';
import { Customer } from '../../domain/entities/customer.entity';
import { CreateCustomerCommand } from '../commands/create-customer.command';
import { UpdateCustomerCommand } from '../commands/update-customer.command';
import { CustomerServicePort } from '../ports/customer-service.port';

@Injectable()
export class CustomerService implements CustomerServicePort {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repo: CustomerRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Customer[]; total: number }> {
    return this.repo.findAll(filters);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.repo.findById(id);
  }

  async create(command: CreateCustomerCommand): Promise<Customer> {
    const existing = await this.repo.findByName(command.name);
    if (existing) {
      throw new ConflictException('Customer with this name already exists');
    }

    const entity = this.repo.create({
      name: command.name,
      email: command.email,
      phone: command.phone,
      address: command.address,
      city: command.city,
      contactPerson: command.contactPerson,
      taxId: command.taxId,
      notes: command.notes,
      status: 'active',
    });

    return this.repo.save(entity);
  }

  async update(id: string, command: UpdateCustomerCommand): Promise<Customer> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Customer not found');

    if (command.name !== undefined) entity.name = command.name;
    if (command.email !== undefined) entity.email = command.email;
    if (command.phone !== undefined) entity.phone = command.phone;
    if (command.address !== undefined) entity.address = command.address;
    if (command.city !== undefined) entity.city = command.city;
    if (command.contactPerson !== undefined)
      entity.contactPerson = command.contactPerson;
    if (command.taxId !== undefined) entity.taxId = command.taxId;
    if (command.notes !== undefined) entity.notes = command.notes;
    if (command.status !== undefined)
      entity.status = command.status as 'active' | 'inactive';

    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Customer not found');
    await this.repo.delete(id);
  }
}
