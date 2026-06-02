import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port';
import type { PayrollRepositoryPort } from '../../domain/repositories/payroll-repository.port';
import type { PaySlipServicePort } from '../ports/payslip-service.port';

@Injectable()
export class PaySlipService implements PaySlipServicePort {
  constructor(
    @Inject(PAYROLL_REPOSITORY)
    private readonly payrollRepo: PayrollRepositoryPort,
  ) {}

  async generatePaySlips(
    payrollRunId: string,
  ): Promise<{ generated: number; path: string }> {
    const run = await this.payrollRepo.findRunById(payrollRunId);
    if (!run) throw new BadRequestException('Payroll run not found');

    const details = await this.payrollRepo.findDetailsByRunId(payrollRunId);

    if (details.length === 0) {
      throw new BadRequestException('No payroll details found for this run');
    }

    // Generate CSV data for all pay slips
    const csvData = this.buildPaySlipCsv(run, details);
    const path = `payslips/${run.year}-${String(run.month).padStart(2, '0')}/all-payslips.csv`;

    // In production, this would write to file storage
    // For now, return the path where it would be stored
    return { generated: details.length, path };
  }

  async getPaySlip(
    payrollRunId: string,
    employeeId: string,
  ): Promise<{
    employee: { id: string; name: string; employeeNumber: string };
    period: { month: number; year: number };
    earnings: {
      basicSalary: number;
      siteAllowance: number;
      mealAllowance: number;
      transportAllowance: number;
      overtimePay: number;
      otherAllowances: number;
      grossPay: number;
    };
    deductions: {
      bpjsKesehatanEmployee: number;
      bpjsJht: number;
      bpjsJp: number;
      pph21: number;
      loanDeduction: number;
      otherDeductions: number;
      totalDeductions: number;
    };
    employerContributions: {
      bpjsKesehatanEmployer: number;
      bpjsJkk: number;
      bpjsJkm: number;
    };
    netPay: number;
  }> {
    const run = await this.payrollRepo.findRunById(payrollRunId);
    if (!run) throw new BadRequestException('Payroll run not found');

    const details = await this.payrollRepo.findDetailsByRunId(payrollRunId);
    const detail = details.find((d: any) => d.employeeId === employeeId);
    if (!detail)
      throw new BadRequestException('Pay slip not found for this employee');

    return {
      employee: {
        id: employeeId,
        name: detail.employeeName,
        employeeNumber: detail.employeeNumber ?? '',
      },
      period: { month: run.month, year: run.year },
      earnings: {
        basicSalary: Number(detail.basicSalary),
        siteAllowance: Number(detail.siteAllowance),
        mealAllowance: Number(detail.mealAllowance),
        transportAllowance: Number(detail.transportAllowance),
        overtimePay: Number(detail.overtimePay),
        otherAllowances: Number(detail.otherAllowances),
        grossPay: Number(detail.grossPay),
      },
      deductions: {
        bpjsKesehatanEmployee: Number(detail.bpjsKesehatanEmployee),
        bpjsJht: Number(detail.bpjsJht),
        bpjsJp: Number(detail.bpjsJp),
        pph21: Number(detail.pph21),
        loanDeduction: Number(detail.loanDeduction),
        otherDeductions: Number(detail.otherDeductions),
        totalDeductions: Number(detail.totalDeductions),
      },
      employerContributions: {
        bpjsKesehatanEmployer: Number(detail.bpjsKesehatanEmployer),
        bpjsJkk: Number(detail.bpjsJkk),
        bpjsJkm: Number(detail.bpjsJkm),
      },
      netPay: Number(detail.netPay),
    };
  }

  async downloadAll(payrollRunId: string): Promise<string> {
    const run = await this.payrollRepo.findRunById(payrollRunId);
    if (!run) throw new BadRequestException('Payroll run not found');

    const details = await this.payrollRepo.findDetailsByRunId(payrollRunId);

    if (details.length === 0) {
      throw new BadRequestException('No payroll details found for this run');
    }

    return this.buildPaySlipCsv(run, details);
  }

  private buildPaySlipCsv(run: any, details: any[]): string {
    const headers = [
      'Employee Name',
      'Period',
      'Basic Salary',
      'Site Allowance',
      'Meal Allowance',
      'Transport Allowance',
      'Overtime Pay',
      'Other Allowances',
      'Gross Pay',
      'BPJS Kesehatan (Employee)',
      'BPJS Kesehatan (Employer)',
      'BPJS JKK',
      'BPJS JKM',
      'BPJS JHT',
      'BPJS JP',
      'PPh 21',
      'Loan Deduction',
      'Other Deductions',
      'Total Deductions',
      'Net Pay',
    ];

    const lines = [headers.join(',')];
    const period = `${run.year}-${String(run.month).padStart(2, '0')}`;

    for (const detail of details) {
      lines.push(
        [
          `"${detail.employeeName}"`,
          period,
          detail.basicSalary,
          detail.siteAllowance,
          detail.mealAllowance,
          detail.transportAllowance,
          detail.overtimePay,
          detail.otherAllowances,
          detail.grossPay,
          detail.bpjsKesehatanEmployee,
          detail.bpjsKesehatanEmployer,
          detail.bpjsJkk,
          detail.bpjsJkm,
          detail.bpjsJht,
          detail.bpjsJp,
          detail.pph21,
          detail.loanDeduction,
          detail.otherDeductions,
          detail.totalDeductions,
          detail.netPay,
        ].join(','),
      );
    }

    return lines.join('\n');
  }
}
