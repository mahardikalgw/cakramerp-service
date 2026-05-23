import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { THR_REPOSITORY } from '../../domain/repositories/thr-repository.port'
import type { ThrRepositoryPort } from '../../domain/repositories/thr-repository.port'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import type { ThrServicePort } from '../ports/thr-service.port'

@Injectable()
export class ThrService implements ThrServicePort {
  constructor(
    @Inject(THR_REPOSITORY)
    private readonly thrRepo: ThrRepositoryPort,
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
  ) {}

  async calculate(year: number): Promise<{ calculated: number; excluded: number }> {
    // Delete existing draft records for this year
    await this.thrRepo.deleteByYear(year)

    const employees = await this.employeeRepo.findActiveEmployees()

    let calculated = 0
    let excluded = 0

    for (const emp of employees) {
      const joinDate = new Date(emp.joinDate)
      const thrCutoffDate = new Date(year, 3, 1) // April 1st as typical THR reference date
      const monthsOfService = this.calculateMonthsOfService(joinDate, thrCutoffDate)

      // Exclude employees with less than 1 month of service
      if (monthsOfService < 1) {
        excluded++
        continue
      }

      const monthlySalary = Number(emp.basicSalary)
      const isProRated = monthsOfService < 12
      const thrAmount = isProRated
        ? (monthsOfService / 12) * monthlySalary
        : monthlySalary

      await this.thrRepo.create({
        employeeId: emp.id,
        employeeName: emp.fullName,
        year,
        employmentType: emp.employmentType,
        monthsOfService,
        monthlySalary,
        thrAmount,
        isProRated,
        isExcluded: false,
        status: 'calculated',
      })

      calculated++
    }

    return { calculated, excluded }
  }

  async getRecords(year: number): Promise<any[]> {
    return this.thrRepo.findByYear(year)
  }

  async confirm(id: string, userId: string): Promise<any> {
    const record = await this.thrRepo.findById(id)
    if (!record) throw new BadRequestException('THR record not found')
    if (record.status !== 'calculated') {
      throw new BadRequestException('Only calculated THR records can be confirmed')
    }

    const saved = await this.thrRepo.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
    })

    // Create journal entry for THR expense
    await this.createThrJournalEntry(record, userId)

    return saved
  }

  private calculateMonthsOfService(joinDate: Date, referenceDate: Date): number {
    const years = referenceDate.getFullYear() - joinDate.getFullYear()
    const months = referenceDate.getMonth() - joinDate.getMonth()
    const totalMonths = years * 12 + months

    // Adjust if reference day is before join day
    if (referenceDate.getDate() < joinDate.getDate()) {
      return Math.max(0, totalMonths - 1)
    }

    return Math.max(0, totalMonths)
  }

  private async createThrJournalEntry(
    record: any,
    userId: string,
  ): Promise<void> {
    // Integration point with finance module
    // Creates journal entries for:
    // - Debit: THR Expense account
    // - Credit: THR Payable / Cash account
    // This should be wired to the finance module's JournalEntryService
  }
}
