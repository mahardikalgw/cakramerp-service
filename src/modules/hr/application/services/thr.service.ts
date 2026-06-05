import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { THR_REPOSITORY } from '../../domain/repositories/thr-repository.port';
import type { ThrRepositoryPort } from '../../domain/repositories/thr-repository.port';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port';
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port';
import { JOURNAL_ENTRY_SERVICE } from '../../../finance/application/ports/journal-entry-service.port';
import type { JournalEntryServicePort } from '../../../finance/application/ports/journal-entry-service.port';
import { ACCOUNT_REPOSITORY } from '../../../finance/domain/repositories/finance-repository.port';
import type { AccountRepositoryPort } from '../../../finance/domain/repositories/finance-repository.port';
import type { ThrServicePort } from '../ports/thr-service.port';

@Injectable()
export class ThrService implements ThrServicePort {
  constructor(
    @Inject(THR_REPOSITORY)
    private readonly thrRepo: ThrRepositoryPort,
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
    @Inject(JOURNAL_ENTRY_SERVICE)
    private readonly journalEntryService: JournalEntryServicePort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
  ) {}

  async calculate(
    year: number,
  ): Promise<{ calculated: number; excluded: number }> {
    // Delete existing draft records for this year
    await this.thrRepo.deleteByYear(year);

    const employees = await this.employeeRepo.findActiveEmployees();

    let calculated = 0;
    let excluded = 0;

    for (const emp of employees) {
      const joinDate = new Date(emp.joinDate);
      const thrCutoffDate = new Date(year, 3, 1); // April 1st as typical THR reference date
      const monthsOfService = this.calculateMonthsOfService(
        joinDate,
        thrCutoffDate,
      );

      // Exclude employees with less than 1 month of service
      if (monthsOfService < 1) {
        excluded++;
        continue;
      }

      const monthlySalary = Number(emp.basicSalary);
      const isProRated = monthsOfService < 12;
      const thrAmount = isProRated
        ? (monthsOfService / 12) * monthlySalary
        : monthlySalary;

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
      });

      calculated++;
    }

    return { calculated, excluded };
  }

  async getRecords(year: number): Promise<any[]> {
    return this.thrRepo.findByYear(year);
  }

  async confirm(id: string, userId: string): Promise<any> {
    const record = await this.thrRepo.findById(id);
    if (!record) throw new BadRequestException('THR record not found');
    if (record.status !== 'calculated') {
      throw new BadRequestException(
        'Only calculated THR records can be confirmed',
      );
    }

    const saved = await this.thrRepo.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });

    // Create journal entry for THR expense
    await this.createThrJournalEntry(record, userId);

    return saved;
  }

  private calculateMonthsOfService(
    joinDate: Date,
    referenceDate: Date,
  ): number {
    const years = referenceDate.getFullYear() - joinDate.getFullYear();
    const months = referenceDate.getMonth() - joinDate.getMonth();
    const totalMonths = years * 12 + months;

    // Adjust if reference day is before join day
    if (referenceDate.getDate() < joinDate.getDate()) {
      return Math.max(0, totalMonths - 1);
    }

    return Math.max(0, totalMonths);
  }

  private async createThrJournalEntry(
    record: any,
    userId: string,
  ): Promise<void> {
    const thrExpenseAcc = await this.accountRepo.findByCode('5200');
    const thrPayableAcc = await this.accountRepo.findByCode('2320');
    const cashAcc = await this.accountRepo.findByCode('1100');

    const expenseAccountId = thrExpenseAcc?.id ?? cashAcc?.id;
    const creditAccountId = thrPayableAcc?.id ?? cashAcc?.id;

    if (!expenseAccountId || !creditAccountId) return;

    await this.journalEntryService.create(
      {
        date: new Date().toISOString().split('T')[0],
        description: `THR payment - ${record.employeeName} (${record.year})`,
        reference: `THR-${record.year}-${record.employeeId}`,
        lines: [
          {
            accountId: expenseAccountId,
            debit: Number(record.thrAmount),
            credit: 0,
            description: 'THR expense',
          },
          {
            accountId: creditAccountId,
            debit: 0,
            credit: Number(record.thrAmount),
            description: 'THR payable',
          },
        ],
      },
      userId ?? null,
      false,
    );
  }
}
