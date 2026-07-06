import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PAYROLL_QUEUE_NAME } from './payroll.constants';
import { PAYROLL_SERVICE } from '../modules/hr/application/ports/payroll-service.port';
import type { PayrollServicePort } from '../modules/hr/application/ports/payroll-service.port';

export interface PayrollJobData {
  month: number;
  year: number;
  requestedBy: string;
}

@Processor(PAYROLL_QUEUE_NAME)
export class PayrollProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(
    @Inject(PAYROLL_SERVICE)
    private readonly payrollService: PayrollServicePort,
  ) {
    super();
  }

  async process(job: Job<PayrollJobData>): Promise<any> {
    const { month, year, requestedBy } = job.data;
    this.logger.log(
      `Processing payroll for ${month}/${year} (requested by ${requestedBy})...`,
    );

    try {
      const result = await this.payrollService.runPayroll(month, year);
      this.logger.log(
        `Payroll completed for ${month}/${year}: ${result.totalEmployees} employees, net ${result.totalNet}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Payroll failed for ${month}/${year}: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }
}
