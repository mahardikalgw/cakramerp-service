import { Injectable, Inject } from '@nestjs/common'
import { BPJS_REPOSITORY } from '../../domain/repositories/bpjs-repository.port'
import type { BpjsRepositoryPort } from '../../domain/repositories/bpjs-repository.port'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port'
import type { PayrollRepositoryPort } from '../../domain/repositories/payroll-repository.port'
import type { BpjsServicePort } from '../ports/bpjs-service.port'

export interface BpjsReportRow {
  employeeId: string
  employeeName: string
  employeeNumber: string
  program: string
  memberNumber: string
  salary: number
  bpjsKesehatanEmployee: number
  bpjsKesehatanEmployer: number
  bpjsJkk: number
  bpjsJkm: number
  bpjsJht: number
  bpjsJp: number
  status: 'active' | 'new' | 'terminated' | 'salary_changed'
  previousSalary?: number
}

@Injectable()
export class BpjsReportService implements BpjsServicePort {
  constructor(
    @Inject(BPJS_REPOSITORY)
    private readonly bpjsRepo: BpjsRepositoryPort,
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
    @Inject(PAYROLL_REPOSITORY)
    private readonly payrollRepo: PayrollRepositoryPort,
  ) {}

  async generateReport(month: number, year: number): Promise<BpjsReportRow[]> {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    // Get all active BPJS enrollments
    const enrollments = await this.bpjsRepo.findActiveEnrollments()

    // Get payroll details for the month
    const payrollRun = await this.payrollRepo.findRunByMonthYear(month, year)
    const payrollDetails = payrollRun
      ? await this.payrollRepo.findDetailsByRunId(payrollRun.id)
      : []

    // Get prior month payroll for salary change detection
    const priorMonth = month === 1 ? 12 : month - 1
    const priorYear = month === 1 ? year - 1 : year
    const priorRun = await this.payrollRepo.findRunByMonthYear(priorMonth, priorYear)
    const priorDetails = priorRun
      ? await this.payrollRepo.findDetailsByRunId(priorRun.id)
      : []

    // Get employees for name/number lookup
    const employeeIds = [...new Set(enrollments.map((e: any) => e.employeeId))]
    const employees: any[] = []
    for (const empId of employeeIds) {
      const emp = await this.employeeRepo.findById(empId)
      if (emp) employees.push(emp)
    }

    const employeeMap = new Map(employees.map((e: any) => [e.id, e]))
    const priorDetailMap = new Map(priorDetails.map((d: any) => [d.employeeId, d]))

    const report: BpjsReportRow[] = []

    for (const enrollment of enrollments) {
      const employee = employeeMap.get(enrollment.employeeId)
      if (!employee) continue

      const detail = payrollDetails.find((d: any) => d.employeeId === enrollment.employeeId)
      const priorDetail = priorDetailMap.get(enrollment.employeeId)

      // Determine status
      let status: BpjsReportRow['status'] = 'active'
      const enrollDate = new Date(enrollment.enrollmentDate)

      if (
        enrollDate >= startOfMonth &&
        enrollDate <= endOfMonth
      ) {
        status = 'new'
      } else if (
        enrollment.endDate &&
        new Date(enrollment.endDate) >= startOfMonth &&
        new Date(enrollment.endDate) <= endOfMonth
      ) {
        status = 'terminated'
      } else if (
        priorDetail &&
        detail &&
        Number(detail.basicSalary) !== Number(priorDetail.basicSalary)
      ) {
        status = 'salary_changed'
      }

      report.push({
        employeeId: enrollment.employeeId,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        program: enrollment.program,
        memberNumber: enrollment.memberNumber,
        salary: Number(enrollment.salary),
        bpjsKesehatanEmployee: detail ? Number(detail.bpjsKesehatanEmployee) : 0,
        bpjsKesehatanEmployer: detail ? Number(detail.bpjsKesehatanEmployer) : 0,
        bpjsJkk: detail ? Number(detail.bpjsJkk) : 0,
        bpjsJkm: detail ? Number(detail.bpjsJkm) : 0,
        bpjsJht: detail ? Number(detail.bpjsJht) : 0,
        bpjsJp: detail ? Number(detail.bpjsJp) : 0,
        status,
        previousSalary: priorDetail ? Number(priorDetail.basicSalary) : undefined,
      })
    }

    return report
  }

  async exportReport(month: number, year: number): Promise<string> {
    const report = await this.generateReport(month, year)

    // BPJS portal format CSV
    const headers = [
      'No',
      'Nomor Peserta',
      'Nama Peserta',
      'NIK',
      'Program',
      'Upah',
      'JKK',
      'JKM',
      'JHT Pekerja',
      'JHT Pemberi Kerja',
      'JP Pekerja',
      'JP Pemberi Kerja',
      'Kes Pekerja',
      'Kes Pemberi Kerja',
      'Keterangan',
    ]

    const lines = [headers.join(',')]

    report.forEach((row, index) => {
      const statusLabel =
        row.status === 'new'
          ? 'BARU'
          : row.status === 'terminated'
            ? 'KELUAR'
            : row.status === 'salary_changed'
              ? 'PERUBAHAN UPAH'
              : 'AKTIF'

      lines.push(
        [
          index + 1,
          row.memberNumber,
          `"${row.employeeName}"`,
          row.employeeNumber,
          row.program,
          row.salary,
          row.bpjsJkk,
          row.bpjsJkm,
          row.bpjsJht,
          Math.round(row.salary * 0.037), // JHT employer
          row.bpjsJp,
          Math.round(Math.min(row.salary, 9_559_600) * 0.02), // JP employer
          row.bpjsKesehatanEmployee,
          row.bpjsKesehatanEmployer,
          statusLabel,
        ].join(','),
      )
    })

    return lines.join('\n')
  }
}
