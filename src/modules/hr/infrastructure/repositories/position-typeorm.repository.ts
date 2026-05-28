import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { PositionRepositoryPort } from '../../domain/repositories/position-repository.port'
import { PositionTypeOrmEntity } from '../entities/position-typeorm.entity'

@Injectable()
export class PositionTypeOrmRepository implements PositionRepositoryPort {
  private readonly repo: Repository<PositionTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(PositionTypeOrmEntity)
  }

  async findAll(filters?: {
    search?: string; departmentId?: string; isActive?: boolean; page?: number; limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.repo.createQueryBuilder('pos')

    if (filters?.search) {
      qb.andWhere('pos.name ILIKE :search', { search: `%${filters.search}%` })
    }
    if (filters?.departmentId) {
      qb.andWhere('pos.departmentId = :departmentId', { departmentId: filters.departmentId })
    }
    if (filters?.isActive !== undefined) {
      qb.andWhere('pos.isActive = :isActive', { isActive: filters.isActive })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('pos.name', 'ASC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByNameAndDepartment(name: string, departmentId?: string): Promise<any | null> {
    const where: any = { name }
    if (departmentId) where.departmentId = departmentId
    return this.repo.findOne({ where })
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }

  async update(id: string, data: any): Promise<any> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return null
    Object.assign(entity, data)
    return this.repo.save(entity)
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
