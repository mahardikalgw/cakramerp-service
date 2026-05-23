import { Injectable } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { AttendanceRepositoryPort } from '../../domain/repositories/attendance-repository.port'
import { AttendanceRecordTypeOrmEntity } from '../entities/attendance-record-typeorm.entity'

@Injectable()
export class AttendanceTypeOrmRepository implements AttendanceRepositoryPort {
  private readonly attendanceRepo: Repository<AttendanceRecordTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.attendanceRepo = dataSource.getRepository(AttendanceRecordTypeOrmEntity)
  }

  async findByEmployeeIdsAndMonth(
    employeeIds: string[],
    month: number,
    year: number,
  ): Promise<any[]> {
    if (employeeIds.length === 0) return []

    return this.attendanceRepo
      .createQueryBuilder('att')
      .where('att.employeeId IN (:...employeeIds)', { employeeIds })
      .andWhere('EXTRACT(MONTH FROM att.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM att.date) = :year', { year })
      .getMany()
  }

  async findByEmployeeAndDate(employeeId: string, date: Date): Promise<any | null> {
    return this.attendanceRepo.findOne({
      where: { employeeId, date },
    })
  }

  async create(data: any): Promise<any> {
    const record = this.attendanceRepo.create(data)
    return this.attendanceRepo.save(record)
  }

  async update(id: string, data: any): Promise<any> {
    const record = await this.attendanceRepo.findOne({ where: { id } })
    if (!record) return null
    Object.assign(record, data)
    return this.attendanceRepo.save(record)
  }

  async getOvertimeHours(employeeId: string, month: number, year: number): Promise<number> {
    const result = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('COALESCE(SUM(att.overtimeHours), 0)', 'total')
      .where('att.employeeId = :employeeId', { employeeId })
      .andWhere('EXTRACT(MONTH FROM att.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM att.date) = :year', { year })
      .getRawOne()

    return Number(result?.total ?? 0)
  }
}
