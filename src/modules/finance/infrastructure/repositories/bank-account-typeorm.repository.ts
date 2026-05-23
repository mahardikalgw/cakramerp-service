import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { BankAccountTypeOrmEntity } from '../entities/bank-account-typeorm.entity'
import { BankAccountRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class BankAccountTypeOrmRepository implements BankAccountRepositoryPort {
  private readonly repo: Repository<BankAccountTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(BankAccountTypeOrmEntity)
  }

  async findActive(): Promise<BankAccountTypeOrmEntity[]> {
    return this.repo.find({ where: { isActive: true }, order: { bankName: 'ASC' } })
  }
}
