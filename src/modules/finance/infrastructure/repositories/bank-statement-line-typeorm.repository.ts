import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { BankStatementLineTypeOrmEntity } from '../entities/bank-statement-line-typeorm.entity'
import { BankStatementLineRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class BankStatementLineTypeOrmRepository implements BankStatementLineRepositoryPort {
  private readonly repo: Repository<BankStatementLineTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(BankStatementLineTypeOrmEntity)
  }

  async find(options: any): Promise<BankStatementLineTypeOrmEntity[]> {
    return this.repo.find(options)
  }

  async findOne(options: any): Promise<BankStatementLineTypeOrmEntity | null> {
    return this.repo.findOne(options)
  }

  async save(entity: any): Promise<BankStatementLineTypeOrmEntity> {
    return this.repo.save(entity) as Promise<BankStatementLineTypeOrmEntity>
  }

  create(data: any): BankStatementLineTypeOrmEntity {
    return this.repo.create(data as Partial<BankStatementLineTypeOrmEntity>)
  }
}
