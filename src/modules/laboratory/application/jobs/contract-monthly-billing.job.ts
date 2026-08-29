import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import { AR_INVOICE_SERVICE } from '../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../finance/application/ports/ar-invoice-service.port';
import { CreateARInvoiceCommand } from '../../../finance/application/commands/create-ar-invoice.command';

const TAX_PERCENT = 11;

@Injectable()
export class ContractMonthlyBillingJob {
  private readonly logger = new Logger(ContractMonthlyBillingJob.name);

  constructor(
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 1 25 * *')
  async generateMonthlyInvoices() {
    this.logger.log(
      '[CRON] Generating monthly AR invoices for active unlimited contracts...',
    );
    try {
      const result = await this.contractRepo.findAll({
        filters: { status: 'active' },
      });
      const activeContracts = result.data.filter((c) => (c as any).isUnlimited);

      for (const contract of activeContracts) {
        try {
          const billingStart =
            (contract as any).lastBillingDate ||
            (contract as any).billingStartDate;
          if (!billingStart) {
            this.logger.warn(
              `[CRON] Contract ${contract.id} has no billing start date, skipping`,
            );
            continue;
          }

          const billingEnd = new Date();
          billingEnd.setDate(25);

          // Skip if invoice already exists for this period.
          const existing = await this.findInvoiceForPeriod(
            contract.id,
            new Date(billingStart),
            billingEnd,
          );
          if (existing) {
            this.logger.log(
              `[CRON] AR invoice already exists for contract ${contract.id}, skipping`,
            );
            continue;
          }

          // Count confirmed testing results in period.
          const results =
            await this.testResultRepo.findCompletedByContractAndPeriod(
              contract.id,
              new Date(billingStart),
              billingEnd,
            );

          if (results.length === 0) {
            this.logger.log(
              `[CRON] No completed tests for contract ${contract.id} in this period, skipping`,
            );
            continue;
          }

          const today = new Date().toISOString().slice(0, 10);
          const dueDate = new Date(Date.now() + 30 * 86400000)
            .toISOString()
            .slice(0, 10);

          const command = new CreateARInvoiceCommand(
            contract.customerId,
            contract.customerName,
            today,
            dueDate,
            results.map((r: any) => ({
              description: r.serviceName ?? 'Testing Service',
              quantity: 1,
              unitPrice: Number(r.unitPrice ?? 0),
              taxPercent: TAX_PERCENT,
              testResultId: r.id,
              sampleCode: r.sampleCode ?? undefined,
            })),
            contract.customerId,
            undefined, // segment
            undefined, // projectId
            undefined, // sendEmail
            undefined, // paymentTermDays
            undefined, // paymentTermLabel
            undefined, // additionalDiscount
            true, // asDraft
            'lab_contract',
            contract.id,
            contract.id,
            undefined, // testingScheduleId
            new Date(billingStart).toISOString().slice(0, 10),
            billingEnd.toISOString().slice(0, 10),
            results.length,
            undefined, // initialFeeApplied
          );

          const created = await this.arInvoiceService.create(command, true);
          (contract as any).lastBillingDate = billingEnd;
          await this.contractRepo.save(contract);
          this.logger.log(
            `[CRON] Generated AR invoice ${created.invoiceNumber} for contract ${contract.id}`,
          );
        } catch (err: any) {
          this.logger.error(
            `[CRON] Failed to generate invoice for contract ${contract.id}: ${err?.message}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `[CRON] Monthly billing job failed: ${err?.message}`,
        err?.stack,
      );
    }
  }

  private async findInvoiceForPeriod(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<any> {
    const { data } = await this.arInvoiceService.findAll({
      contractId,
      billingPeriodStart: periodStart.toISOString().slice(0, 10),
      billingPeriodEnd: periodEnd.toISOString().slice(0, 10),
      page: 1,
      limit: 1,
    });
    return data.length > 0 ? data[0] : null;
  }
}
