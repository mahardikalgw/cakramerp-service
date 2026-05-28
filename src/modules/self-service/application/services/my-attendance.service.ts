import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { DataSource, Between } from 'typeorm'
import { MyAttendanceServicePort } from '../ports/my-attendance-service.port'
import { DISCREPANCY_REPORT_REPOSITORY } from '../../domain/repositories/self-service-repository.port'
import type { DiscrepancyReportRepositoryPort } from '../../domain/repositories/self-service-repository.port'
import { AttendanceRecordTypeOrmEntity } from '../../../hr/infrastructure/entities/attendance-record-typeorm.entity'
import { EmployeeTypeOrmEntity } from '../../../hr/infrastructure/entities/employee-typeorm.entity'

@Injectable()
export class MyAttendanceService implements MyAttendanceServicePort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(DISCREPANCY_REPORT_REPOSITORY)
    private readonly discrepancyReportRepo: DiscrepancyReportRepositoryPort,
  ) {}

  async getMonthlyAttendance(employeeId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

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
          summary.present++
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

  async getTodayAttendance(employeeId: string): Promise<any> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const attendanceRepo = this.dataSource.getRepository(AttendanceRecordTypeOrmEntity)
    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity)

    const employee = await employeeRepo.findOne({ where: { id: employeeId } })
    const record = await attendanceRepo.findOne({
      where: { employeeId, date: today },
    })

    return {
      date: today.toISOString().split('T')[0],
      clockIn: record?.clockIn ?? null,
      clockOut: record?.clockOut ?? null,
      status: record?.status ?? null,
      hasClockedIn: !!record?.clockIn,
      hasClockedOut: !!record?.clockOut,
      workStartTime: employee?.workStartTime ?? '08:00',
      workEndTime: employee?.workEndTime ?? '17:00',
    }
  }

  async clockIn(employeeId: string): Promise<any> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    const attendanceRepo = this.dataSource.getRepository(AttendanceRecordTypeOrmEntity)
    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity)

    let record = await attendanceRepo.findOne({
      where: { employeeId, date: today },
    })

    if (record?.clockIn) {
      throw new BadRequestException('You have already clocked in today')
    }

    // Get employee's configured work start time
    const employee = await employeeRepo.findOne({ where: { id: employeeId } })
    const workStartTime = employee?.workStartTime ?? '08:00'
    const [startHour, startMinute] = workStartTime.split(':').map(Number)

    const lateThreshold = new Date(today)
    lateThreshold.setHours(startHour, startMinute, 0, 0)
    const isLate = now > lateThreshold

    if (record) {
      record.clockIn = now
      record.status = isLate ? 'late' : 'present'
      return attendanceRepo.save(record)
    }

    const newRecord = attendanceRepo.create({
      employeeId,
      date: today,
      clockIn: now,
      clockOut: null,
      status: isLate ? 'late' : 'present',
      isImported: false,
      overtimeHours: 0,
    })

    return attendanceRepo.save(newRecord)
  }

  async clockOut(employeeId: string): Promise<any> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    const attendanceRepo = this.dataSource.getRepository(AttendanceRecordTypeOrmEntity)
    const employeeRepo = this.dataSource.getRepository(EmployeeTypeOrmEntity)

    const record = await attendanceRepo.findOne({
      where: { employeeId, date: today },
    })

    if (!record || !record.clockIn) {
      throw new BadRequestException('You must clock in before clocking out')
    }

    if (record.clockOut) {
      throw new BadRequestException('You have already clocked out today')
    }

    record.clockOut = now

    // Get employee's configured work hours to calculate overtime
    const employee = await employeeRepo.findOne({ where: { id: employeeId } })
    const workStartTime = employee?.workStartTime ?? '08:00'
    const workEndTime = employee?.workEndTime ?? '17:00'
    const breakMinutes = employee?.breakDurationMinutes ?? 60

    const [startH, startM] = workStartTime.split(':').map(Number)
    const [endH, endM] = workEndTime.split(':').map(Number)
    const scheduledWorkMinutes = (endH * 60 + endM) - (startH * 60 + startM) - breakMinutes

    // Calculate actual hours worked
    const actualMinutesWorked = (now.getTime() - new Date(record.clockIn).getTime()) / (1000 * 60) - breakMinutes
    const overtimeMinutes = actualMinutesWorked - scheduledWorkMinutes

    if (overtimeMinutes > 0) {
      record.overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100
    }

    return attendanceRepo.save(record)
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
