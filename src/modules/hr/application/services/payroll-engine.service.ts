import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port'
import type { PayrollRepositoryPort } from '../../domain/repositories/payroll-repository.port'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import { ATTENDANCE_REPOSITORY } from '../../domain/repositories/attendance-repository.port'
import type { AttendanceRepositoryPort } from '../../domain/repositories/attendance-repository.port'
import { GlPostingQueueTypeOrmEntity } from '../../../finance/infrastructure/entities/gl-posting-queue-typeorm.entity'
import type { PayrollServicePort } from '../ports/payroll-service.port'

@Injectable()
export class PayrollEngineService implements PayrollServicePort {
  // BPJS caps
  private readonly BPJS_KES_MAX_BASE = 12_000_000
  private readonly BPJS_JP_MAX_BASE = 9_559_600

  // BPJS rates
  private readonly BPJS_KES_EMPLOYEE_RATE = 0.01
  private readonly BPJS_KES_EMPLOYER_RATE = 0.04
  private readonly BPJS_JKK_RATE = 0.0024
  private readonly BPJS_JKM_RATE = 0.003
  private readonly BPJS_JHT_EMPLOYEE_RATE = 0.02
  private readonly BPJS_JHT_EMPLOYER_RATE = 0.037
  private readonly BPJS_JP_EMPLOYEE_RATE = 0.01
  private readonly BPJS_JP_EMPLOYER_RATE = 0.02

  // PTKP (single)
  private readonly PTKP = 54_000_000

  constructor(
    @Inject(PAYROLL_REPOSITORY)
    private readonly payrollRepo: PayrollRepositoryPort,
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepo: AttendanceRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  async runPayroll(month: number, year: number): Promise<any> {
    // Prevent re-running if period already confirmed/posted
    const existing = await this.payrollRepo.findRunByMonthYear(month, year)
    if (existing && (existing.status === 'confirmed' || existing.status === 'posted')) {
      throw new BadRequestException(
        `Payroll for ${month}/${year} has already been ${existing.status}`,
      )
    }

    // If draft exists, delete it and re-run
    if (existing && existing.status === 'draft') {
      await this.payrollRepo.deleteDetailsByRunId(existing.id)
      await this.payrollRepo.deleteRun(existing.id)
    }

    const employees = await this.employeeRepo.findActiveEmployees()

    const payrollRun = await this.payrollRepo.createRun({
      month,
      year,
      status: 'draft',
      totalGross: 0,
      totalNet: 0,
      totalEmployees: employees.length,
    })

    let totalGross = 0
    let totalNet = 0

    for (const emp of employees) {
      const detail = await this.calculateEmployeePayroll(payrollRun.id, emp, month, year)
      totalGross += Number(detail.grossPay)
      totalNet += Number(detail.netPay)
    }

    return this.payrollRepo.updateRun(payrollRun.id, {
      totalGross,
      totalNet,
    })
  }

  async getPayrollRun(id: string): Promise<any> {
    const run = await this.payrollRepo.findRunById(id)
    if (!run) throw new BadRequestException('Payroll run not found')

    const details = await this.payrollRepo.findDetailsByRunId(id)

    return { run, details }
  }

  async getPayrollRuns(filters?: {
    year?: number
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    return this.payrollRepo.findAllRuns(filters)
  }

  async confirmPayroll(id: string, userId: string): Promise<any> {
    const run = await this.payrollRepo.findRunById(id)
    if (!run) throw new BadRequestException('Payroll run not found')
    if (run.status !== 'draft') {
      throw new BadRequestException('Only draft payroll runs can be confirmed')
    }

    return this.payrollRepo.updateRun(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: userId,
    })
  }

  async postToGL(id: string, userId: string): Promise<any> {
    const run = await this.payrollRepo.findRunById(id)
    if (!run) throw new BadRequestException('Payroll run not found')
    if (run.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed payroll runs can be posted to GL')
    }

    // Create GL Posting Queue entry instead of direct journal entry
    await this.createPayrollQueueEntry(run)

    return this.payrollRepo.updateRun(id, {
      status: 'posted',
      postedAt: new Date(),
      postedBy: userId,
    })
  }

  private async calculateEmployeePayroll(
    payrollRunId: string,
    employee: any,
    month: number,
    year: number,
  ): Promise<any> {
    const basicSalary = Number(employee.basicSalary)

    // Calculate overtime from attendance records
    const overtimeHours = await this.attendanceRepo.getOvertimeHours(employee.id, month, year)
    const overtimeRate = basicSalary / 173 // Standard monthly working hours
    const overtimePay = overtimeHours * overtimeRate * 1.5

    // Allowances (can be extended to pull from employee config)
    const siteAllowance = 0
    const mealAllowance = 0
    const transportAllowance = 0

    const grossPay = basicSalary + siteAllowance + mealAllowance + transportAllowance + overtimePay

    // BPJS Kesehatan
    const bpjsKesBase = Math.min(grossPay, this.BPJS_KES_MAX_BASE)
    const bpjsKesehatanEmployee = bpjsKesBase * this.BPJS_KES_EMPLOYEE_RATE
    const bpjsKesehatanEmployer = bpjsKesBase * this.BPJS_KES_EMPLOYER_RATE

    // BPJS JKK & JKM (employer only)
    const bpjsJkk = grossPay * this.BPJS_JKK_RATE
    const bpjsJkm = grossPay * this.BPJS_JKM_RATE

    // BPJS JHT
    const bpjsJhtEmployee = grossPay * this.BPJS_JHT_EMPLOYEE_RATE
    const bpjsJhtEmployer = grossPay * this.BPJS_JHT_EMPLOYER_RATE

    // BPJS JP
    const bpjsJpBase = Math.min(grossPay, this.BPJS_JP_MAX_BASE)
    const bpjsJpEmployee = bpjsJpBase * this.BPJS_JP_EMPLOYEE_RATE
    const bpjsJpEmployer = bpjsJpBase * this.BPJS_JP_EMPLOYER_RATE

    // PPh 21 calculation
    const monthlyBpjsEmployee = bpjsKesehatanEmployee + bpjsJhtEmployee + bpjsJpEmployee
    const annualTaxableIncome = (grossPay - monthlyBpjsEmployee) * 12 - this.PTKP
    const annualTax = this.calculatePph21(annualTaxableIncome)
    const pph21 = Math.max(0, annualTax / 12)

    // Loan deduction (placeholder - can be extended)
    const loanDeduction = 0

    const totalDeductions =
      bpjsKesehatanEmployee + bpjsJhtEmployee + bpjsJpEmployee + pph21 + loanDeduction
    const netPay = grossPay - totalDeductions

    return this.payrollRepo.createDetail({
      payrollRunId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      basicSalary,
      siteAllowance,
      mealAllowance,
      transportAllowance,
      overtimePay,
      otherAllowances: 0,
      grossPay,
      bpjsKesehatanEmployee,
      bpjsKesehatanEmployer,
      bpjsJkk,
      bpjsJkm,
      bpjsJht: bpjsJhtEmployee,
      bpjsJp: bpjsJpEmployee,
      pph21,
      loanDeduction,
      otherDeductions: 0,
      totalDeductions,
      netPay,
    })
  }

  private calculatePph21(annualTaxableIncome: number): number {
    if (annualTaxableIncome <= 0) return 0

    let tax = 0
    let remaining = annualTaxableIncome

    // Bracket 1: 0 - 60M at 5%
    const bracket1 = Math.min(remaining, 60_000_000)
    tax += bracket1 * 0.05
    remaining -= bracket1

    if (remaining <= 0) return tax

    // Bracket 2: 60M - 250M at 15%
    const bracket2 = Math.min(remaining, 190_000_000)
    tax += bracket2 * 0.15
    remaining -= bracket2

    if (remaining <= 0) return tax

    // Bracket 3: 250M - 500M at 25%
    const bracket3 = Math.min(remaining, 250_000_000)
    tax += bracket3 * 0.25
    remaining -= bracket3

    if (remaining <= 0) return tax

    // Bracket 4: 500M - 5B at 30%
    const bracket4 = Math.min(remaining, 4_500_000_000)
    tax += bracket4 * 0.30
    remaining -= bracket4

    if (remaining <= 0) return tax

    // Bracket 5: > 5B at 35%
    tax += remaining * 0.35

    return tax
  }

  private async createPayrollQueueEntry(run: any): Promise<void> {
    const details = await this.payrollRepo.findDetailsByRunId(run.id)

    const totalGross = details.reduce((s: number, d: any) => s + Number(d.grossPay), 0)
    const totalBpjsEmployee = details.reduce(
      (s: number, d: any) =>
        s + Number(d.bpjsKesehatanEmployee) + Number(d.bpjsJht) + Number(d.bpjsJp),
      0,
    )
    const totalBpjsEmployer = details.reduce(
      (s: number, d: any) =>
        s + Number(d.bpjsKesehatanEmployer) + Number(d.bpjsJkk) + Number(d.bpjsJkm),
      0,
    )
    const totalPph21 = details.reduce((s: number, d: any) => s + Number(d.pph21), 0)
    const totalNet = details.reduce((s: number, d: any) => s + Number(d.netPay), 0)

    const queueRepo = this.dataSource.getRepository(GlPostingQueueTypeOrmEntity)

    await queueRepo.save(queueRepo.create({
      sourceType: 'payroll',
      sourceId: run.id,
      sourceNumber: `PAYROLL-${run.year}-${String(run.month).padStart(2, '0')}`,
      eventType: 'payroll_run',
      amount: totalGross,
      description: `Payroll ${run.month}/${run.year} — ${details.length} employees`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '5101',
          accountName: 'Biaya Gaji Karyawan',
          debit: totalGross,
          credit: 0,
          description: `Gaji karyawan periode ${run.month}/${run.year}`,
        },
        {
          accountId: '',
          accountCode: '5102',
          accountName: 'Biaya BPJS Perusahaan',
          debit: totalBpjsEmployer,
          credit: 0,
          description: 'Biaya BPJS perusahaan',
        },
        {
          accountId: '',
          accountCode: '2300',
          accountName: 'Hutang BPJS',
          debit: 0,
          credit: totalBpjsEmployee + totalBpjsEmployer,
          description: 'Hutang BPJS (karyawan + perusahaan)',
        },
        {
          accountId: '',
          accountCode: '2310',
          accountName: 'Hutang PPh 21',
          debit: 0,
          credit: totalPph21,
          description: 'Hutang PPh 21',
        },
        {
          accountId: '',
          accountCode: '1100',
          accountName: 'Kas & Bank',
          debit: 0,
          credit: totalNet,
          description: 'Pembayaran bersih gaji karyawan',
        },
      ],
      status: 'pending',
    }))
  }
}
