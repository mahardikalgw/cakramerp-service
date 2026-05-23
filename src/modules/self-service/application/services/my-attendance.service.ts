import { Injectable, Inject } from '@nestjs/common'
import { DataSource, Between } from 'typeorm'
import { MyAttendanceServicePort } from '../ports/my-attendance-service.port'
import { DISCREPANCY_REPORT_REPOSITORY } from '../../domain/repositories/self-service-repository.port'
import type { DiscrepancyReportRepositoryPort } from '../../domain/repositories/self-service-repository.port'
import { AttendanceRecordTypeOrmEntity } from '../../../hr/infrastructure/entities/attendance-record-typeorm.entity'

@Injectable()
export class MyAttendanceService implements MyAttendanceServicePort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(DISCREPANCY_REPORT_REPOSITORY)
    private readonly discrepancyReportRepo: DiscrepancyReportRepositoryPort,
  ) {}

  async getMonthlyAttendance(employeeId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // last day of month

    const attendanceRepo = this.dataSource.getRepository(AttendanceRecordTypeOrmEntity)
    const records = await attendanceRepo.find({
      where: {
        employeeId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    })

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      overtime: 0,
    }

    for (const record of records) {
      switch (record.status) {
        case 'present':
          summary.present++
          break
        case 'absent':
          summary.absent++
          break
        case 'late':
          summary.late++
          summary.present++ // late is still present
          break
      }
      if (record.overtimeHours > 0) {
        summary.overtime += Number(record.overtimeHours)
      }
    }

    return {
      month,
      year,
      records,
      summary,
    }
  }

  async flagDiscrepancy(
    employeeId: string,
    data: { attendanceDate: string; description: string },
  ): Promise<any> {
    return this.discrepancyReportRepo.create({
      employeeId,
      attendanceDate: new Date(data.attendanceDate),
      description: data.description,
      status: 'pending',
    })
  }
}
