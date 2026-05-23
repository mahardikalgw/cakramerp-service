import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { ThrRepositoryPort } from '../../domain/repositories/thr-repository.port'
import { ThrRecordTypeOrmEntity } from '../entities/thr-record-typeorm.entity'

@Injectable()
export class ThrTypeOrmRepository implements ThrRepositoryPort {
  private readonly thrRecordRepo: Repository<ThrRecordTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.thrRecordRepo = dataSource.getRepository(ThrRecordTypeOrmEntity)
  }

  async findByYear(year: number): Promise<any[]> {
    return this.thrRecordRepo.find({
      where: { year },
      order: { employeeName: 'ASC' },
    })
  }

  async findById(id: string): Promise<any | null> {
    return this.thrRecordRepo.findOne({ where: { id } })
  }

  async create(data: any): Promise<any> {
    const record = this.thrRecordRepo.create(data)
    return this.thrRecordRepo.save(record)
  }

  async createMany(data: any[]): Promise<any[]> {
    const records = this.thrRecordRepo.create(data)
    return this.thrRecordRepo.save(records)
  }

  async update(id: string, data: any): Promise<any> {
    const record = await this.thrRecordRepo.findOne({ where: { id } })
    if (!record) return null
    Object.assign(record, data)
    return this.thrRecordRepo.save(record)
  }

  async deleteByYear(year: number): Promise<void> {
    await this.thrRecordRepo
      .createQueryBuilder()
      .delete()
      .where('year = :year', { year })
      .andWhere('status = :status', { status: 'calculated' })
      .execute()
  }
}
