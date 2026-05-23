import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { PayrollRepositoryPort } from '../../domain/repositories/payroll-repository.port'
import { PayrollRunTypeOrmEntity } from '../entities/payroll-run-typeorm.entity'
import { PayrollDetailTypeOrmEntity } from '../entities/payroll-detail-typeorm.entity'

@Injectable()
export class PayrollTypeOrmRepository implements PayrollRepositoryPort {
  private readonly payrollRunRepo: Repository<PayrollRunTypeOrmEntity>
  private readonly payrollDetailRepo: Repository<PayrollDetailTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.payrollRunRepo = dataSource.getRepository(PayrollRunTypeOrmEntity)
    this.payrollDetailRepo = dataSource.getRepository(PayrollDetailTypeOrmEntity)
  }

  async findRunByMonthYear(month: number, year: number): Promise<any | null> {
    return this.payrollRunRepo.findOne({ where: { month, year } })
  }

  async findRunById(id: string): Promise<any | null> {
    return this.payrollRunRepo.findOne({ where: { id } })
  }

  async findAllRuns(filters?: {
    year?: number
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.payrollRunRepo.createQueryBuilder('pr')

    if (filters?.year) {
      qb.andWhere('pr.year = :year', { year: filters.year })
    }
    if (filters?.status) {
      qb.andWhere('pr.status = :status', { status: filters.status })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('pr.year', 'DESC').addOrderBy('pr.month', 'DESC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async createRun(data: any): Promise<any> {
    const run = this.payrollRunRepo.create(data)
    return this.payrollRunRepo.save(run)
  }

  async updateRun(id: string, data: any): Promise<any> {
    const run = await this.payrollRunRepo.findOne({ where: { id } })
    if (!run) return null
    Object.assign(run, data)
    return this.payrollRunRepo.save(run)
  }

  async deleteRun(id: string): Promise<void> {
    await this.payrollRunRepo.delete({ id })
  }

  async createDetail(data: any): Promise<any> {
    const detail = this.payrollDetailRepo.create(data)
    return this.payrollDetailRepo.save(detail)
  }

  async findDetailsByRunId(runId: string): Promise<any[]> {
    return this.payrollDetailRepo.find({
      where: { payrollRunId: runId },
      order: { employeeName: 'ASC' },
    })
  }

  async deleteDetailsByRunId(runId: string): Promise<void> {
    await this.payrollDetailRepo.delete({ payrollRunId: runId })
  }
}
