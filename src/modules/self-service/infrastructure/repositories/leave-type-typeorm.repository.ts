import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { LeaveTypeRepositoryPort } from '../../domain/repositories/self-service-repository.port'
import { LeaveTypeTypeOrmEntity } from '../entities/leave-type-typeorm.entity'

@Injectable()
export class LeaveTypeTypeOrmRepository implements LeaveTypeRepositoryPort {
  private readonly repo: Repository<LeaveTypeTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(LeaveTypeTypeOrmEntity)
  }

  async findAll(): Promise<any[]> {
    return this.repo.find({ order: { name: 'ASC' } })
  }

  async findById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findActive(): Promise<any[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    })
  }
}
