import { Injectable } from '@nestjs/common'
import { DataSource, Between, Repository } from 'typeorm'
import { ShiftScheduleRepositoryPort } from '../../domain/repositories/self-service-repository.port'
import { ShiftScheduleTypeOrmEntity } from '../entities/shift-schedule-typeorm.entity'

@Injectable()
export class ShiftScheduleTypeOrmRepository implements ShiftScheduleRepositoryPort {
  private readonly repo: Repository<ShiftScheduleTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ShiftScheduleTypeOrmEntity)
  }

  async findByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.repo.find({
      where: {
        employeeId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    })
  }

  async create(data: any): Promise<any> {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }

  async createMany(data: any[]): Promise<any[]> {
    const entities = this.repo.create(data)
    return this.repo.save(entities)
  }
}
