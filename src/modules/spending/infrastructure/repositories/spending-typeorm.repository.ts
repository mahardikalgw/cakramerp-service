import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { Spending } from '../../domain/entities/spending.entity';
import { SpendingTypeOrmEntity } from '../entities/spending-typeorm.entity';
import { SpendingRepositoryPort } from '../../domain/repositories/spending-repository.port';

@Injectable()
export class SpendingTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Spending, SpendingTypeOrmEntity>
  implements SpendingRepositoryPort
{
  protected readonly repository: Repository<SpendingTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SpendingTypeOrmEntity);
  }

  toDomain(entity: SpendingTypeOrmEntity): Spending {
    return new Spending({
      id: entity.id,
      spendingNumber: entity.spendingNumber,
      expenseCategory: entity.expenseCategory,
      amount: Number(entity.amount),
      spendingDate: entity.spendingDate,
      description: entity.description,
      vendor: entity.vendor,
      referenceNo: entity.referenceNo,
      status: entity.status as Spending['status'],
      paymentMethod: entity.paymentMethod as Spending['paymentMethod'],
      glPostingQueueId: entity.glPostingQueueId,
      journalEntryId: entity.journalEntryId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Spending): SpendingTypeOrmEntity {
    const entity = new SpendingTypeOrmEntity();
    entity.id = domain.id;
    entity.spendingNumber = domain.spendingNumber;
    entity.expenseCategory = domain.expenseCategory;
    entity.amount = domain.amount;
    entity.spendingDate = domain.spendingDate;
    entity.description = domain.description;
    entity.vendor = domain.vendor;
    entity.referenceNo = domain.referenceNo;
    entity.status = domain.status;
    entity.paymentMethod = domain.paymentMethod;
    entity.glPostingQueueId = domain.glPostingQueueId;
    entity.journalEntryId = domain.journalEntryId;
    return entity;
  }

  async findBySpendingNumber(spendingNumber: string): Promise<Spending | null> {
    const entity = await this.repository.findOne({
      where: { spendingNumber },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastSpendingNumber(prefix: string): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('s')
      .select('s.spendingNumber', 'spendingNumber')
      .where('s.spendingNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.spendingNumber', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.spendingNumber ?? null;
  }
}
