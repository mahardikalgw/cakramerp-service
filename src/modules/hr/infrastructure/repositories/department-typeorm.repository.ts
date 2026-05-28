import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { DepartmentRepositoryPort } from '../../domain/repositories/department-repository.port'
import { DepartmentTypeOrmEntity } from '../entities/department-typeorm.entity'

@Injectable()
export class DepartmentTypeOrmRepository implements DepartmentRepositoryPort {
  private readonly repo: Repository<DepartmentTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(DepartmentTypeOrmEntity)
  }

  async findAll(filters?: {
    search?: string; isActive?: boolean; page?: number; limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.repo.createQueryBuilder('dept')

    if (filters?.search) {
      qb.andWhere('dept.name ILIKE :search', { search: `%${filters.search}%` })
    }
    if (filters?.isActive !== undefined) {
      qb.andWhere('dept.isActive = :isActive', { isActive: filters.isActive })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('dept.name', 'ASC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findById(id: string): Promise<any | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByName(name: string): Promise<any | null> {
    return this.repo.findOne({ where: { name } })
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
