import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { ReconciliationSessionTypeOrmEntity } from '../entities/reconciliation-session-typeorm.entity'
import { ReconciliationSessionRepositoryPort } from '../../domain/repositories/finance-repository.port'

@Injectable()
export class ReconciliationSessionTypeOrmRepository implements ReconciliationSessionRepositoryPort {
  private readonly repo: Repository<ReconciliationSessionTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ReconciliationSessionTypeOrmEntity)
  }

  async findOne(options: any): Promise<ReconciliationSessionTypeOrmEntity | null> {
    return this.repo.findOne(options)
  }

  async save(entity: any): Promise<ReconciliationSessionTypeOrmEntity> {
    return this.repo.save(entity) as Promise<ReconciliationSessionTypeOrmEntity>
  }

  create(data: any): ReconciliationSessionTypeOrmEntity {
    return this.repo.create(data as Partial<ReconciliationSessionTypeOrmEntity>)
  }
}
