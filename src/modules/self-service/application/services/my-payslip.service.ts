import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MyPayslipServicePort } from '../ports/my-payslip-service.port';
import { PayrollRunTypeOrmEntity } from '../../../hr/infrastructure/entities/payroll-run-typeorm.entity';
import { PayrollDetailTypeOrmEntity } from '../../../hr/infrastructure/entities/payroll-detail-typeorm.entity';

@Injectable()
export class MyPayslipService implements MyPayslipServicePort {
  constructor(private readonly dataSource: DataSource) {}

  async getPayslips(employeeId: string): Promise<any[]> {
    const detailRepo = this.dataSource.getRepository(
      PayrollDetailTypeOrmEntity,
    );
    const runRepo = this.dataSource.getRepository(PayrollRunTypeOrmEntity);

    const details = await detailRepo.find({
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });

    const payslips: any[] = [];
    for (const detail of details) {
      const run = await runRepo.findOne({
        where: { id: detail.payrollRunId, status: 'posted' },
      });
      if (run) {
        payslips.push({
          payrollRunId: run.id,
          month: run.month,
          year: run.year,
          postedAt: run.postedAt,
          grossPay: detail.grossPay,
          totalDeductions: detail.totalDeductions,
          netPay: detail.netPay,
        });
      }
    }

    return payslips;
  }

  async downloadPayslip(
    employeeId: string,
    payrollId: string,
  ): Promise<string> {
    const detailRepo = this.dataSource.getRepository(
      PayrollDetailTypeOrmEntity,
    );
    const detail = await detailRepo.findOne({
      where: { employeeId, payrollRunId: payrollId },
    });
    if (!detail) {
      throw new NotFoundException('Payslip not found for this payroll run');
    }

    // Return a placeholder file path with expiry
    const expiry = Date.now() + 3600 * 1000;
    return `/payslips/${payrollId}/${employeeId}.pdf?expires=${expiry}`;
  }

  async getTaxYtdSummary(employeeId: string, year: number): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT 
        COALESCE(SUM(pd.pph21), 0) as total_pph21,
        COALESCE(SUM(pd.gross_pay), 0) as total_gross,
        COALESCE(SUM(pd.net_pay), 0) as total_net,
        COUNT(pd.id) as months_count
      FROM payroll_details pd
      INNER JOIN payroll_runs pr ON pr.id = pd.payroll_run_id
      WHERE pd.employee_id = $1
        AND pr.year = $2
        AND pr.status = 'posted'`,
      [employeeId, year],
    );

    const summary = result[0] || {};
    return {
      year,
      totalPph21: Number(summary.total_pph21) || 0,
      totalGross: Number(summary.total_gross) || 0,
      totalNet: Number(summary.total_net) || 0,
      monthsCount: Number(summary.months_count) || 0,
    };
  }

  async downloadBuktiPotong(employeeId: string, year: number): Promise<string> {
    const expiry = Date.now() + 3600 * 1000;
    return `/tax/1721-A1/${year}/${employeeId}.pdf?expires=${expiry}`;
  }
}
