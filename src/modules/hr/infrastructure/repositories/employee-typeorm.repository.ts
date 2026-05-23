import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import { EmployeeTypeOrmEntity } from '../entities/employee-typeorm.entity'
import { EmployeeDocumentTypeOrmEntity } from '../entities/employee-document-typeorm.entity'
import { EmployeeHistoryTypeOrmEntity } from '../entities/employee-history-typeorm.entity'

@Injectable()
export class EmployeeTypeOrmRepository implements EmployeeRepositoryPort {
  private readonly employeeRepo: Repository<EmployeeTypeOrmEntity>
  private readonly documentRepo: Repository<EmployeeDocumentTypeOrmEntity>
  private readonly historyRepo: Repository<EmployeeHistoryTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.employeeRepo = dataSource.getRepository(EmployeeTypeOrmEntity)
    this.documentRepo = dataSource.getRepository(EmployeeDocumentTypeOrmEntity)
    this.historyRepo = dataSource.getRepository(EmployeeHistoryTypeOrmEntity)
  }

  async findAll(filters?: {
    search?: string
    employmentType?: string
    siteId?: string
    departmentId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.employeeRepo.createQueryBuilder('emp')

    if (filters?.search) {
      qb.andWhere(
        '(emp.fullName ILIKE :search OR emp.employeeNumber ILIKE :search OR emp.email ILIKE :search)',
        { search: `%${filters.search}%` },
      )
    }
    if (filters?.employmentType) {
      qb.andWhere('emp.employmentType = :employmentType', {
        employmentType: filters.employmentType,
      })
    }
    if (filters?.siteId) {
      qb.andWhere('emp.siteId = :siteId', { siteId: filters.siteId })
    }
    if (filters?.departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      })
    }
    if (filters?.status) {
      qb.andWhere('emp.status = :status', { status: filters.status })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('emp.fullName', 'ASC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findById(id: string): Promise<any | null> {
    return this.employeeRepo.findOne({ where: { id } })
  }

  async findActiveEmployees(siteId?: string, departmentId?: string): Promise<any[]> {
    const qb = this.employeeRepo.createQueryBuilder('emp')
    qb.where('emp.status = :status', { status: 'active' })

    if (siteId) {
      qb.andWhere('emp.siteId = :siteId', { siteId })
    }
    if (departmentId) {
      qb.andWhere('emp.departmentId = :departmentId', { departmentId })
    }

    return qb.orderBy('emp.fullName', 'ASC').getMany()
  }

  async create(data: any): Promise<any> {
    const employee = this.employeeRepo.create(data)
    return this.employeeRepo.save(employee)
  }

  async update(id: string, data: any): Promise<any> {
    const employee = await this.employeeRepo.findOne({ where: { id } })
    if (!employee) return null
    Object.assign(employee, data)
    return this.employeeRepo.save(employee)
  }

  async getLastEmployeeNumber(prefix: string): Promise<string | null> {
    const last = await this.employeeRepo
      .createQueryBuilder('emp')
      .where('emp.employeeNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('emp.employeeNumber', 'DESC')
      .getOne()

    return last?.employeeNumber ?? null
  }

  async createDocument(data: any): Promise<any> {
    const document = this.documentRepo.create(data)
    return this.documentRepo.save(document)
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    return this.documentRepo.find({
      where: { employeeId },
      order: { uploadedAt: 'DESC' },
    })
  }

  async createHistoryEvent(data: any): Promise<any> {
    const event = this.historyRepo.create(data)
    return this.historyRepo.save(event)
  }

  async getHistory(employeeId: string): Promise<any[]> {
    return this.historyRepo.find({
      where: { employeeId },
      order: { effectiveDate: 'DESC' },
    })
  }
}
