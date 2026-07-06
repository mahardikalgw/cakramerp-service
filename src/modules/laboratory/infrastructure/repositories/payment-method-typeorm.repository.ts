import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { PaymentMethod } from '../../domain/entities/payment.entity';
import { PaymentMethodTypeOrmEntity } from '../entities/payment-method-typeorm.entity';
import { PaymentMethodRepositoryPort } from '../../domain/repositories/payment-repository.port';

@Injectable()
export class PaymentMethodTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    PaymentMethod,
    PaymentMethodTypeOrmEntity
  >
  implements PaymentMethodRepositoryPort
{
  protected readonly repository: Repository<PaymentMethodTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(PaymentMethodTypeOrmEntity);
  }

  toDomain(entity: PaymentMethodTypeOrmEntity): PaymentMethod {
    return new PaymentMethod({
      id: entity.id,
      name: entity.name,
      type: entity.type as PaymentMethod['type'],
      bankName: entity.bankName,
      accountNumber: entity.accountNumber,
      accountHolder: entity.accountHolder,
      virtualAccountPattern: entity.virtualAccountPattern,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: PaymentMethod): PaymentMethodTypeOrmEntity {
    const entity = new PaymentMethodTypeOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.type = domain.type;
    entity.bankName = domain.bankName ?? '';
    entity.accountNumber = domain.accountNumber ?? '';
    entity.accountHolder = domain.accountHolder ?? '';
    entity.virtualAccountPattern = domain.virtualAccountPattern ?? '';
    entity.isActive = domain.isActive ?? true;
    return entity;
  }

  async findActive(): Promise<PaymentMethod[]> {
    const entities = await this.repository.find({
      where: { isActive: true, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
