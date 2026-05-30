import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port'
import type { PayrollRepositoryPort } from '../../domain/repositories/payroll-repository.port'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import { ATTENDANCE_REPOSITORY } from '../../domain/repositories/attendance-repository.port'
import type { AttendanceRepositoryPort } from '../../domain/repositories/attendance-repository.port'
import { JOURNAL_ENTRY_SERVICE } from '../../../finance/application/ports/journal-entry-service.port'
import type { JournalEntryServicePort } from '../../../finance/application/ports/journal-entry-service.port'
import { ACCOUNT_REPOSITORY } from '../../../finance/domain/repositories/finance-repository.port'
import type { AccountRepositoryPort } from '../../../finance/domain/repositories/finance-repository.port'
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
    @Inject(JOURNAL_ENTRY_SERVICE)
    private readonly journalEntryService: JournalEntryServicePort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
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

    // Create journal entries in finance module
    // This would typically call the finance module's journal entry service
    await this.createPayrollJournalEntries(run)

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

  private async createPayrollJournalEntries(run: any): Promise<void> {
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

    // Use 5101 (salary expense) if available, fallback to 5100
    const salaryExpenseAcc = await this.accountRepo.findByCode('5101') ?? await this.accountRepo.findByCode('5100')
    // Use 5102 (BPJS employer expense) if available, fallback to salary expense
    const bpjsExpenseAcc = await this.accountRepo.findByCode('5102') ?? salaryExpenseAcc
    const bpjsPayableAcc = await this.accountRepo.findByCode('2300')
    const pph21PayableAcc = await this.accountRepo.findByCode('2310')
    const cashAcc = await this.accountRepo.findByCode('1100')

    if (!salaryExpenseAcc || !cashAcc) return
    if (!bpjsPayableAcc && (totalBpjsEmployee + totalBpjsEmployer) > 0) return
    if (!pph21PayableAcc && totalPph21 > 0) return

    const lines: { accountId: string; debit: number; credit: number; description?: string }[] = []

    // Debit: Salary expense (gross amount)
    lines.push({
      accountId: salaryExpenseAcc.id,
      debit: totalGross,
      credit: 0,
      description: `Gaji karyawan periode ${run.month}/${run.year}`,
    })

    // Debit: Employer BPJS expense (if separate account)
    if (bpjsExpenseAcc && bpjsExpenseAcc.id !== salaryExpenseAcc.id && totalBpjsEmployer > 0) {
      lines.push({
        accountId: bpjsExpenseAcc.id,
        debit: totalBpjsEmployer,
        credit: 0,
        description: 'Biaya BPJS perusahaan',
      })
    }

    // Credit: BPJS Payable (employee + employer contributions)
    if (bpjsPayableAcc && (totalBpjsEmployee + totalBpjsEmployer) > 0) {
      lines.push({
        accountId: bpjsPayableAcc.id,
        debit: 0,
        credit: totalBpjsEmployee + totalBpjsEmployer,
        description: 'Hutang BPJS (karyawan + perusahaan)',
      })
    }

    // Credit: PPh 21 Payable (tax withheld from employees)
    if (pph21PayableAcc && totalPph21 > 0) {
      lines.push({
        accountId: pph21PayableAcc.id,
        debit: 0,
        credit: totalPph21,
        description: 'Hutang PPh 21',
      })
    }

    // Credit: Cash/Bank (net pay to employees)
    lines.push({
      accountId: cashAcc.id,
      debit: 0,
      credit: totalNet,
      description: 'Pembayaran bersih gaji karyawan',
    })

    // Verify balance before creating
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Payroll journal entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      )
    }

    await this.journalEntryService.create(
      {
        date: new Date().toISOString().split('T')[0],
        description: `Payroll ${run.month}/${run.year}`,
        reference: `PAYROLL-${run.year}-${String(run.month).padStart(2, '0')}`,
        lines,
      },
      'system',
      false,
    )
  }
}
