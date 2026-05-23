import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { OvertimeRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port'
import { OvertimeRequestTypeOrmEntity } from '../entities/overtime-request-typeorm.entity'

@Injectable()
export class OvertimeRequestTypeOrmRepository implements OvertimeRequestRepositoryPort {
  private readonly repo: Repository<OvertimeRequestTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(OvertimeRequestTypeOrmEntity)
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }

  async findByEmployeeId(employeeId: string, filters?: { status?: string }): Promise<any[]> {
    const qb = this.repo.createQueryBuilder('or')
    qb.where('or.employeeId = :employeeId', { employeeId })

    if (filters?.status) {
      qb.andWhere('or.status = :status', { status: filters.status })
    }

    return qb.orderBy('or.date', 'DESC').getMany()
  }

  async findById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } })
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return null
    Object.assign(entity, data)
    return this.repo.save(entity)
  }

  async findPendingBySupervisor(_supervisorId: string): Promise<any[]> {
    // For now, return all pending overtime requests
    // TODO: Filter by supervisor when hierarchy is implemented
    return this.repo.find({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
    })
  }
}
