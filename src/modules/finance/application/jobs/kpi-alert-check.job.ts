import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FINANCE_SERVICE } from '../ports/finance-service.port';
import type { FinanceServicePort } from '../ports/finance-service.port';

@Injectable()
export class KpiAlertCheckJob {
  private readonly logger = new Logger(KpiAlertCheckJob.name);

  constructor(
    @Inject(FINANCE_SERVICE)
    private readonly financeService: FinanceServicePort,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Running KPI threshold check...');
    try {
      await this.financeService.checkThresholdsAndCreateAlerts();
      this.logger.log('KPI threshold check completed');
    } catch (error) {
      this.logger.error('KPI threshold check failed', error);
    }
  }
}
