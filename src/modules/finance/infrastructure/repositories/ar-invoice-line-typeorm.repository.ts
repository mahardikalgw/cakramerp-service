import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { ARInvoiceLineTypeOrmEntity } from '../entities/ar-invoice-line-typeorm.entity'
import { ARInvoiceLineRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class ARInvoiceLineTypeOrmRepository implements ARInvoiceLineRepositoryPort {
  private readonly repo: Repository<ARInvoiceLineTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ARInvoiceLineTypeOrmEntity)
  }

  async findByInvoiceId(invoiceId: string): Promise<ARInvoiceLineTypeOrmEntity[]> {
    return this.repo.find({ where: { invoiceId } })
  }

  async save(line: any): Promise<ARInvoiceLineTypeOrmEntity> {
    return this.repo.save(line) as Promise<ARInvoiceLineTypeOrmEntity>
  }

  create(data: any): ARInvoiceLineTypeOrmEntity {
    return this.repo.create(data as Partial<ARInvoiceLineTypeOrmEntity>)
  }
}
