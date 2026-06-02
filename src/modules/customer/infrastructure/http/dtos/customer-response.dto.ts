import { Customer } from '../../../domain/entities/customer.entity';

export class CustomerResponseDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  contactPerson?: string;
  taxId?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  static fromDomain(entity: Customer): CustomerResponseDto {
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
    };
  }
}
