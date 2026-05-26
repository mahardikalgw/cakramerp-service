import { Supplier } from '../../../domain/entities/supplier.entity';

export class SupplierResponseDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  contactPerson?: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  static fromDomain(entity: Supplier): SupplierResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email ?? undefined,
      phone: entity.phone ?? undefined,
      address: entity.address ?? undefined,
      city: entity.city ?? undefined,
      contactPerson: entity.contactPerson ?? undefined,
      taxId: entity.taxId ?? undefined,
      bankAccount: entity.bankAccount ?? undefined,
      bankName: entity.bankName ?? undefined,
      notes: entity.notes ?? undefined,
      status: entity.status,
      createdAt: entity.createdAt?.toISOString?.() ?? String(entity.createdAt),
      updatedAt: entity.updatedAt?.toISOString?.() ?? String(entity.updatedAt),
    };
  }
}