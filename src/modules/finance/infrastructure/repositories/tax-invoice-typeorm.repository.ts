import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { TaxInvoiceTypeOrmEntity } from '../entities/tax-invoice-typeorm.entity'
import { TaxInvoiceRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class TaxInvoiceTypeOrmRepository implements TaxInvoiceRepositoryPort {
  private readonly repo: Repository<TaxInvoiceTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(TaxInvoiceTypeOrmEntity)
  }

  async findByMonthAndYear(month: number, year: number): Promise<TaxInvoiceTypeOrmEntity[]> {
    return this.repo.find({
      where: { month, year },
      order: { transactionDate: 'ASC' },
    })
  }
}
