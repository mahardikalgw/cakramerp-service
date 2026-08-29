import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AR_INVOICE_SERVICE } from '../../../finance/application/ports/ar-invoice-service.port';
import type { ARInvoiceServicePort } from '../../../finance/application/ports/ar-invoice-service.port';
import { CreateARInvoiceCommand } from '../../../finance/application/commands/create-ar-invoice.command';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TESTING_SERVICE_REPOSITORY } from '../../domain/repositories/testing-service-repository.port';
import type { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import type { LabContractSampleRepositoryPort } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';

const TAX_PERCENT = 11;
const DUE_DAYS = 30;

/**
 * Lab billing adapter — the single entry point that writes ALL lab billing
 * (cash and contract) into the `ar_invoices` table. This makes `ar_invoices`
 * the one source of truth for every transaction, regardless of billing type.
 *
 * Contract invoices support the contract `initial_fee` being applied as a
 * credit: if the remaining credit covers the invoice total it is auto-marked
 * paid, otherwise the customer owes `amount_due`.
 */
@Injectable()
export class LabBillingAdapter {
  private readonly logger = new Logger(LabBillingAdapter.name);

  constructor(
    @Inject(AR_INVOICE_SERVICE)
    private readonly arInvoiceService: ARInvoiceServicePort,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    @Inject(LAB_CONTRACT_SAMPLE_REPOSITORY)
    private readonly contractSampleRepo: LabContractSampleRepositoryPort,
    @Inject(TESTING_SERVICE_REPOSITORY)
    private readonly testingServiceRepo: TestingServiceRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  /** Create (or return existing) cash AR invoice from a testing request. */
  async createCashInvoice(input: {
    requestId: string;
    requestNumber: string;
    customerId: string;
    customerName: string;
    taxPercent?: number;
    invoiceDate?: string;
    lines: {
      serviceName?: string | null;
      quantity: number;
      unitPrice: number;
      sampleCode?: string | null;
    }[];
  }): Promise<any> {
    const existing = await this.findBySource('lab_cash', input.requestId);
    if (existing) return existing;

    const today = input.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const dueDate = this.addDays(today, DUE_DAYS);
    const taxPercent = input.taxPercent ?? 0;

    const command = new CreateARInvoiceCommand(
      input.customerId,
      input.customerName,
      today,
      dueDate,
      input.lines.map((l) => ({
        description: l.serviceName || 'Testing Service',
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxPercent,
        sampleCode: l.sampleCode ?? undefined,
      })),
      input.customerId,
      undefined, // segment
      undefined, // projectId
      undefined, // sendEmail
      undefined, // paymentTermDays
      undefined, // paymentTermLabel
      undefined, // additionalDiscount
      true, // asDraft
      'lab_cash',
      input.requestId,
    );

    return this.arInvoiceService.create(command, true);
  }

  /**
   * Build a contract AR invoice from the confirmed test results that fall
   * within a given schedule (or the most recent confirmed schedule when
   * `testingScheduleId` is omitted). The contract's `initial_fee` is applied
   * as a credit; if it covers the full amount the invoice is auto-paid.
   */
  async createContractScheduleInvoice(
    contractId: string,
    testingScheduleId: string | null,
  ): Promise<any> {
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.billingType !== 'contract') {
      throw new BadRequestException(
        'Billing sample-test invoices is only supported for contract-billing contracts',
      );
    }

    // Idempotency: if an invoice already exists for this schedule, return it.
    if (testingScheduleId) {
      const existing = await this.findBySchedule(testingScheduleId);
      if (existing) return existing;
    }

    const confirmedResults =
      await this.testResultRepo.findByContractId(contractId);
    const eligibleResults = (() => {
      if (testingScheduleId) {
        return confirmedResults.filter(
          (r: any) =>
            r.status === 'confirmed' && r.scheduleId === testingScheduleId,
        );
      }
      const confirmed = confirmedResults.filter(
        (r: any) => r.status === 'confirmed',
      );
      if (confirmed.length === 0) return [];
      const latestScheduleId = confirmed[0].scheduleId;
      return confirmed.filter((r: any) => r.scheduleId === latestScheduleId);
    })();

    if (eligibleResults.length === 0) {
      throw new BadRequestException(
        testingScheduleId
          ? 'No confirmed test results found for this schedule'
          : 'No confirmed test results found for this contract',
      );
    }

    // Price lookup from negotiated contract-sample prices, falling back to
    // testing-service master prices when the contract-sample price is 0.
    const contractSamples =
      await this.contractSampleRepo.findByContractId(contractId);
    const priceBySampleId = new Map<string, number>();
    const serviceIdBySampleId = new Map<string, string>();
    for (const cs of contractSamples as any[]) {
      priceBySampleId.set(cs.id, Number(cs.unitPrice ?? 0));
      if (cs.testingServiceId) {
        serviceIdBySampleId.set(cs.id, cs.testingServiceId);
      }
    }

    const priceByServiceId = new Map<string, number>();
    const uniqueServiceIds = [...new Set(serviceIdBySampleId.values())];
    for (const sid of uniqueServiceIds) {
      if (!priceByServiceId.has(sid)) {
        try {
          const svc = await this.testingServiceRepo.findById(sid);
          if (svc) priceByServiceId.set(sid, Number(svc.unitPrice ?? 0));
        } catch {
          /* ignore */
        }
      }
    }

    let baseAmount = 0;
    const lines = eligibleResults.map((r: any) => {
      const contractSamplePrice = r.contractSampleId
        ? priceBySampleId.get(r.contractSampleId)
        : undefined;
      const unitPrice = Number(
        (contractSamplePrice != null && contractSamplePrice > 0
          ? contractSamplePrice
          : r.contractSampleId
            ? priceByServiceId.get(
                serviceIdBySampleId.get(r.contractSampleId) ?? '',
              )
            : undefined) ??
          r.unitPrice ??
          0,
      );
      const quantity = 1;
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
      baseAmount += totalPrice;
      return {
        description: r.serviceName ?? 'Testing Service',
        quantity,
        unitPrice,
        taxPercent: TAX_PERCENT,
        testResultId: r.id,
        sampleCode: r.sampleCode ?? undefined,
      };
    });
    baseAmount = Math.round(baseAmount * 100) / 100;
    const taxAmount =
      Math.round(((baseAmount * TAX_PERCENT) / 100) * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

    // Initial fee credit application.
    const initialFeeTotal = Number(contract.initialFee ?? 0);
    const alreadyApplied = await this.sumInitialFeeApplied(contractId);
    const remainingCredit = Math.max(0, initialFeeTotal - alreadyApplied);
    const initialFeeApplied = Math.min(remainingCredit, totalAmount);

    const schedule = eligibleResults[0] as any;
    const period = schedule.scheduledDate ?? schedule.confirmedAt;
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = this.addDays(today, DUE_DAYS);

    const command = new CreateARInvoiceCommand(
      contract.customerId,
      contract.customerName,
      today,
      dueDate,
      lines,
      contract.customerId,
      undefined, // segment
      undefined, // projectId
      undefined, // sendEmail
      undefined, // paymentTermDays
      undefined, // paymentTermLabel
      undefined, // additionalDiscount
      false, // asDraft → issued (sent) so customers can upload proof; fully-paid is forced to 'paid'
      'lab_contract',
      contractId,
      contractId,
      testingScheduleId ?? undefined,
      period ? this.toDateString(period) : undefined,
      period ? this.toDateString(period) : undefined,
      eligibleResults.length,
      Math.round(initialFeeApplied * 100) / 100,
    );

    const created = await this.arInvoiceService.create(command, false);
    this.logger.log(
      `[LAB BILLING] Created contract AR invoice ${created.invoiceNumber} for contract ${contractId}`,
    );
    return created;
  }

  /** Sum of `initial_fee_applied` across non-cancelled AR invoices for a contract. */
  async sumInitialFeeApplied(contractId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(initial_fee_applied), 0) AS s
         FROM ar_invoices
        WHERE contract_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'`,
      [contractId],
    );
    return Number(rows[0]?.s ?? 0);
  }

  private async findBySource(
    sourceType: string,
    sourceId: string,
  ): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT id FROM ar_invoices
        WHERE source_type = $1 AND source_id = $2 AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [sourceType, sourceId],
    );
    if (rows.length === 0) return null;
    return this.arInvoiceService.findById(rows[0].id);
  }

  private async findBySchedule(scheduleId: string): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT id FROM ar_invoices
        WHERE testing_schedule_id = $1 AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [scheduleId],
    );
    if (rows.length === 0) return null;
    return this.arInvoiceService.findById(rows[0].id);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private toDateString(value: any): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
}
