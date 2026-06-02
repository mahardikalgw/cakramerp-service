import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ATTENDANCE_REPOSITORY } from '../../domain/repositories/attendance-repository.port';
import type { AttendanceRepositoryPort } from '../../domain/repositories/attendance-repository.port';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port';
import type { AttendanceServicePort } from '../ports/attendance-service.port';
import { RecordAttendanceCommand } from '../commands/record-attendance.command';
import { ImportAttendanceCommand } from '../commands/import-attendance.command';

export interface ImportCsvLineDto {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
}

interface DailyStatus {
  date: string;
  status: string;
  clockIn?: string;
  clockOut?: string;
  overtimeHours: number;
}

export interface EmployeeGrid {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  days: DailyStatus[];
}

export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  overtimeHours: number;
}

@Injectable()
export class AttendanceService implements AttendanceServicePort {
  private readonly DEFAULT_SHIFT_START_HOUR = 8;
  private readonly DEFAULT_SHIFT_START_MINUTE = 0;

  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: AttendanceRepositoryPort,
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
  ) {}

  async getMonthlyGrid(
    month: number,
    year: number,
    siteId?: string,
    departmentId?: string,
  ): Promise<EmployeeGrid[]> {
    const employees = await this.employeeRepo.findActiveEmployees(
      siteId,
      departmentId,
    );
    const employeeIds = employees.map((e: any) => e.id);

    if (employeeIds.length === 0) return [];

    const records = await this.attendanceRepo.findByEmployeeIdsAndMonth(
      employeeIds,
      month,
      year,
    );

    const daysInMonth = new Date(year, month, 0).getDate();

    return employees.map((emp: any) => {
      const empRecords = records.filter((r: any) => r.employeeId === emp.id);
      const days: DailyStatus[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = empRecords.find(
          (r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr,
        );

        days.push({
          date: dateStr,
          status: record?.status ?? '-',
          clockIn: record?.clockIn?.toISOString() ?? undefined,
          clockOut: record?.clockOut?.toISOString() ?? undefined,
          overtimeHours: Number(record?.overtimeHours ?? 0),
        });
      }

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        days,
      };
    });
  }

  async getSummary(
    month: number,
    year: number,
    siteId?: string,
    departmentId?: string,
  ): Promise<EmployeeSummary[]> {
    const employees = await this.employeeRepo.findActiveEmployees(
      siteId,
      departmentId,
    );
    const employeeIds = employees.map((e: any) => e.id);

    if (employeeIds.length === 0) return [];

    const records = await this.attendanceRepo.findByEmployeeIdsAndMonth(
      employeeIds,
      month,
      year,
    );

    return employees.map((emp: any) => {
      const empRecords = records.filter((r: any) => r.employeeId === emp.id);

      return {
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        presentDays: empRecords.filter((r: any) => r.status === 'present')
          .length,
        absentDays: empRecords.filter((r: any) => r.status === 'absent').length,
        lateDays: empRecords.filter((r: any) => r.status === 'late').length,
        overtimeHours: empRecords.reduce(
          (sum: number, r: any) => sum + Number(r.overtimeHours),
          0,
        ),
      };
    });
  }

  async recordAttendance(command: RecordAttendanceCommand): Promise<any> {
    const existing = await this.attendanceRepo.findByEmployeeAndDate(
      command.employeeId,
      new Date(command.date),
    );

    const parseClockTime = (time: string | undefined): Date | undefined => {
      if (!time) return undefined;
      if (time.includes('T') || time.includes('-')) return new Date(time);
      return new Date(`${command.date}T${time}:00`);
    };

    if (existing) {
      return this.attendanceRepo.update(existing.id, {
        clockIn: parseClockTime(command.clockIn) ?? existing.clockIn,
        clockOut: parseClockTime(command.clockOut) ?? existing.clockOut,
        status: command.status,
        absenceReason: command.notes ?? existing.absenceReason,
      });
    }

    return this.attendanceRepo.create({
      employeeId: command.employeeId,
      date: new Date(command.date),
      clockIn: parseClockTime(command.clockIn),
      clockOut: parseClockTime(command.clockOut),
      status: command.status ?? 'present',
      absenceReason: command.notes,
      isImported: false,
      overtimeHours: 0,
    });
  }

  async importCsv(
    lines: ImportCsvLineDto[],
  ): Promise<{ imported: number; flaggedLate: number }> {
    let imported = 0;
    let flaggedLate = 0;

    for (const line of lines) {
      const clockIn = new Date(line.clockIn);
      const clockOut = new Date(line.clockOut);

      const isLate =
        clockIn.getHours() > this.DEFAULT_SHIFT_START_HOUR ||
        (clockIn.getHours() === this.DEFAULT_SHIFT_START_HOUR &&
          clockIn.getMinutes() > this.DEFAULT_SHIFT_START_MINUTE);

      const status = isLate ? 'late' : 'present';
      if (isLate) flaggedLate++;

      const existing = await this.attendanceRepo.findByEmployeeAndDate(
        line.employeeId,
        new Date(line.date),
      );

      if (existing) {
        await this.attendanceRepo.update(existing.id, {
          clockIn,
          clockOut,
          status,
          isImported: true,
        });
      } else {
        await this.attendanceRepo.create({
          employeeId: line.employeeId,
          date: new Date(line.date),
          clockIn,
          clockOut,
          status,
          isImported: true,
          overtimeHours: 0,
        });
      }

      imported++;
    }

    return { imported, flaggedLate };
  }

  async exportReport(month: number, year: number): Promise<string> {
    const employees = await this.employeeRepo.findActiveEmployees();
    const employeeIds = employees.map((e: any) => e.id);

    if (employeeIds.length === 0) return '';

    const records = await this.attendanceRepo.findByEmployeeIdsAndMonth(
      employeeIds,
      month,
      year,
    );

    const headers = [
      'Employee Number',
      'Employee Name',
      'Date',
      'Clock In',
      'Clock Out',
      'Status',
      'Overtime Hours',
      'Absence Reason',
    ];
    const csvLines = [headers.join(',')];

    for (const emp of employees) {
      const empRecords = records
        .filter((r: any) => r.employeeId === emp.id)
        .sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

      for (const record of empRecords) {
        csvLines.push(
          [
            emp.employeeNumber,
            `"${emp.fullName}"`,
            new Date(record.date).toISOString().split('T')[0],
            record.clockIn ? new Date(record.clockIn).toISOString() : '',
            record.clockOut ? new Date(record.clockOut).toISOString() : '',
            record.status,
            record.overtimeHours,
            record.absenceReason ? `"${record.absenceReason}"` : '',
          ].join(','),
        );
      }
    }

    return csvLines.join('\n');
  }
}
