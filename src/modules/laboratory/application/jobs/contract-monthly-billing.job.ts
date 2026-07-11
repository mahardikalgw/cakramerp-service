import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { ContractInvoiceRepositoryPort } from '../../domain/repositories/contract-invoice-repository.port';
import { CONTRACT_INVOICE_REPOSITORY } from '../../domain/repositories/contract-invoice-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import { ContractInvoice } from '../../domain/entities/contract-invoice.entity';

@Injectable()
export class ContractMonthlyBillingJob {
  private readonly logger = new Logger(ContractMonthlyBillingJob.name);

  constructor(
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(CONTRACT_INVOICE_REPOSITORY)
    private readonly invoiceRepo: ContractInvoiceRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
  ) {}

  @Cron('0 1 25 * *')
  async generateMonthlyInvoices() {
    this.logger.log(
      '[CRON] Generating monthly invoices for active unlimited contracts...',
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

          // Skip if invoice already exists for this period
          const existing = await this.invoiceRepo.findByBillingPeriod(
            contract.id,
            new Date(billingStart),
            billingEnd,
          );
          if (existing) {
            this.logger.log(
              `[CRON] Invoice already exists for contract ${contract.id}, skipping`,
            );
            continue;
          }

          // Count confirmed testing results in period
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

          const totalSamples = results.length;
          let baseAmount = 0;
          for (const result of results) {
            baseAmount += Number((result as any).unitPrice ?? 0);
          }

          const taxPercent = 11;
          const taxAmount =
            Math.round(baseAmount * (taxPercent / 100) * 100) / 100;
          const totalAmount = baseAmount + taxAmount;

          // generateNextInvoiceNumber() atomically picks the next free
          // CI-NNNNNN value under a PostgreSQL advisory lock and includes
          // soft-deleted rows in the MAX query, so the sequence never
          // collides with a soft-deleted record's UNIQUE constraint.
          const invoiceNumber = await this.invoiceRepo.generateNextInvoiceNumber();

          const invoice = new ContractInvoice({
            invoiceNumber,
            contractId: contract.id,
            billingPeriodStart: new Date(billingStart),
            billingPeriodEnd: billingEnd,
            totalSamples,
            baseAmount,
            taxPercent,
            taxAmount,
            totalAmount,
            status: 'issued',
          });

          await this.invoiceRepo.save(invoice);
          (contract as any).lastBillingDate = billingEnd;
          await this.contractRepo.save(contract);
          this.logger.log(
            `[CRON] Generated invoice ${invoiceNumber} for contract ${contract.id}`,
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
}
