import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ContractTestInvoice,
  ContractTestInvoiceLine,
} from '../../domain/entities/contract-test-invoice.entity';
import type { ContractTestInvoiceRepositoryPort } from '../../domain/repositories/contract-test-invoice-repository.port';
import { CONTRACT_TEST_INVOICE_REPOSITORY } from '../../domain/repositories/contract-test-invoice-repository.port';
import type { PostApprovalLabContractRepositoryPort } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/post-approval-lab-contract-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import type { LabContractSampleRepositoryPort } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from '../../infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';
import {
  DOCUMENT_TYPES,
  OUTPUT_FORMATS,
} from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { LabActivityLogService } from './lab-activity-log.service';
import { v4 as uuidv4 } from 'uuid';

const TAX_PERCENT = 11;
const DUE_DAYS = 30;

@Injectable()
export class ContractTestInvoiceService {
  private readonly logger = new Logger(ContractTestInvoiceService.name);

  constructor(
    @Inject(CONTRACT_TEST_INVOICE_REPOSITORY)
    private readonly repository: ContractTestInvoiceRepositoryPort,
    @Inject(POST_APPROVAL_LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: PostApprovalLabContractRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    @Inject(LAB_CONTRACT_SAMPLE_REPOSITORY)
    private readonly contractSampleRepo: LabContractSampleRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioService: MinioClientService,
    private readonly activityLog: LabActivityLogService,
  ) {}

  // ─── Admin: generate invoice for a schedule ────────────────────────────

  /**
   * Build a new invoice from the confirmed test results that fall within a
   * given schedule for the given contract. The contract's `initial_fee` is
   * applied as a credit against the invoice total:
   *   - if remaining initial fee credit >= total_amount → invoice is
   *     auto-marked paid and no amount is due
   *   - otherwise → the initial fee covers part of the total and the
   *     customer owes `amount_due`
   *
   * If `testingScheduleId` is omitted, the most recent schedule that has at
   * least one confirmed test result is used. This lets admins trigger billing
   * without having to look up the schedule ID first.
   */
  async generateForSchedule(
    contractId: string,
    testingScheduleId: string | null,
    adminUserId: string,
    adminUserName?: string,
    actorRole: 'admin' | 'customer' = 'admin',
  ): Promise<ContractTestInvoice | null> {
    const contract = await this.contractRepo.findById(contractId);
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.billingType !== 'contract') {
      throw new BadRequestException(
        'Billing sample-test invoices is only supported for contract-billing contracts',
      );
    }

    // Idempotency: if an invoice already exists for this schedule, return it
    // instead of creating a duplicate. This makes both the admin manual trigger
    // and the customer auto-trigger safe to re-invoke.
    if (testingScheduleId) {
      const existing =
        await this.repository.findByScheduleId(testingScheduleId);
      if (existing.length > 0) {
        this.logger.debug(
          `Invoice already exists for schedule ${testingScheduleId}, skipping generation`,
        );
        return existing[0];
      }
    }

    // The monthly cron already produces period-based invoices; this flow is
    // for admin-triggered per-schedule billing.
    const confirmedResults =
      await this.testResultRepo.findByContractId(contractId);
    const eligibleResults = (() => {
      if (testingScheduleId) {
        return confirmedResults.filter(
          (r: any) =>
            r.status === 'confirmed' && r.scheduleId === testingScheduleId,
        );
      }
      // No schedule specified — pick the most recent confirmed one.
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

    // Build a lookup from contractSampleId → unitPrice (the negotiated price
    // captured on the lab_contract_samples row).
    const contractSamples =
      await this.contractSampleRepo.findByContractId(contractId);
    const priceBySampleId = new Map<string, number>();
    for (const cs of contractSamples as any[]) {
      priceBySampleId.set(cs.id, Number(cs.unitPrice ?? 0));
    }

    // Unit price comes from the contract sample (the negotiated price).
    // Fall back to 0 if missing so we never bill an unknown amount silently.
    let baseAmount = 0;
    const lines: ContractTestInvoiceLine[] = eligibleResults.map((r: any) => {
      const unitPrice = Number(
        (r.contractSampleId && priceBySampleId.get(r.contractSampleId)) ??
          r.unitPrice ??
          0,
      );
      const quantity = 1;
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
      baseAmount += totalPrice;
      return new ContractTestInvoiceLine({
        invoiceId: '', // backfilled by repo on save
        testResultId: r.id,
        serviceName: r.serviceName ?? null,
        sampleCode: r.sampleCode ?? null,
        unitPrice,
        quantity,
        totalPrice,
      });
    });
    baseAmount = Math.round(baseAmount * 100) / 100;

    const taxAmount = Math.round(baseAmount * (TAX_PERCENT / 100) * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

    // Initial fee credit application
    const initialFeeTotal = Number(contract.initialFee ?? 0);
    const alreadyApplied =
      await this.repository.sumInitialFeeApplied(contractId);
    const remainingCredit = Math.max(0, initialFeeTotal - alreadyApplied);
    const initialFeeApplied = Math.min(remainingCredit, totalAmount);
    const amountDue = Math.max(
      0,
      Math.round((totalAmount - initialFeeApplied) * 100) / 100,
    );

    const isFullyPaidByCredit = amountDue <= 0 && totalAmount > 0;
    const status: ContractTestInvoice['status'] = isFullyPaidByCredit
      ? 'paid'
      : 'issued';

    const schedule = eligibleResults[0] as any;
    const periodStart = new Date(
      schedule.scheduledDate ?? schedule.confirmedAt,
    );
    const periodEnd = new Date(schedule.scheduledDate ?? schedule.confirmedAt);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DUE_DAYS);

    const issuedAt = new Date();
    const paidAt = isFullyPaidByCredit ? issuedAt : null;
    const paidAmount = isFullyPaidByCredit ? totalAmount : null;

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = new ContractTestInvoice({
      invoiceNumber,
      contractId,
      testingScheduleId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      totalSamples: eligibleResults.length,
      baseAmount,
      taxPercent: TAX_PERCENT,
      taxAmount,
      totalAmount,
      initialFeeApplied: Math.round(initialFeeApplied * 100) / 100,
      amountDue,
      status,
      dueDate: isFullyPaidByCredit ? null : dueDate,
      issuedAt,
      paidAt,
      paidAmount,
      lines,
      notes: null,
    });

    const saved = await this.repository.save(invoice);

    // Fire-and-forget document generation.
    void this.generateInvoiceDocument(saved, contract, eligibleResults).catch(
      (err) =>
        this.logger.error(
          `Invoice document generation failed for ${saved.invoiceNumber}: ${err?.message}`,
          err?.stack,
        ),
    );

    void this.activityLog.log({
      testingRequestId: contract.testingRequestId,
      action: 'contract_test_invoice_generated',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: actorRole,
      details: {
        invoiceId: saved.id,
        invoiceNumber: saved.invoiceNumber,
        totalAmount: saved.totalAmount,
        initialFeeApplied: saved.initialFeeApplied,
        amountDue: saved.amountDue,
        status: saved.status,
      },
    } as any);

    return saved;
  }

  private async generateInvoiceDocument(
    invoice: ContractTestInvoice,
    contract: any,
    results: any[],
  ): Promise<void> {
    const docRequest = await this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.LAB_INVOICE,
      entityId: invoice.id,
      tenantId: 'default',
      requestedBy: 'system',
      outputFormat: OUTPUT_FORMATS[0] ?? 'pdf',
      parameters: {
        invoiceNumber: invoice.invoiceNumber,
        contractNumber: contract.contractNumber,
        customerName: contract.customerName,
        billingPeriodStart: invoice.billingPeriodStart
          .toISOString()
          .split('T')[0],
        billingPeriodEnd: invoice.billingPeriodEnd.toISOString().split('T')[0],
        totalSamples: String(invoice.totalSamples),
        subtotal: invoice.baseAmount.toLocaleString('id-ID'),
        baseAmount: invoice.baseAmount.toLocaleString('id-ID'),
        taxPercent: `${invoice.taxPercent}`,
        taxAmount: invoice.taxAmount.toLocaleString('id-ID'),
        totalAmount: invoice.totalAmount.toLocaleString('id-ID'),
        initialFeeApplied: invoice.initialFeeApplied.toLocaleString('id-ID'),
        amountDue: invoice.amountDue.toLocaleString('id-ID'),
        lines: invoice.lines.map((l) => ({
          serviceName: l.serviceName ?? '-',
          sampleCode: l.sampleCode ?? '-',
          unitPrice: l.unitPrice.toLocaleString('id-ID'),
          quantity: String(l.quantity),
          totalPrice: l.totalPrice.toLocaleString('id-ID'),
        })),
      },
    });

    const persisted = await this.repository.findById(invoice.id);
    if (persisted) {
      persisted.invoiceDocumentUrl = docRequest.id;
      await this.repository.save(persisted);
    }
  }

  // ─── Customer: upload payment proof ────────────────────────────────────

  async uploadPaymentProof(
    invoiceId: string,
    file: any,
    userId: string,
    userName?: string,
  ): Promise<ContractTestInvoice> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'issued' && invoice.status !== 'overdue') {
      throw new BadRequestException(
        `Cannot upload proof for invoice in status: ${invoice.status}`,
      );
    }
    if (!file) throw new BadRequestException('Payment proof file is required');

    const objectName = `contract-test-invoices/${invoiceId}/${Date.now()}_${file.originalname}`;
    const url = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    invoice.paymentProofUrl = url;
    invoice.paymentProofFilename = file.originalname;
    invoice.paymentProofUploadedAt = new Date();
    const saved = await this.repository.save(invoice);

    void this.activityLog.log({
      testingRequestId: invoice.testingScheduleId ?? undefined,
      action: 'contract_test_invoice_payment_proof_uploaded',
      performedBy: userId,
      performedByName: userName,
      performedByRole: 'customer',
      details: {
        invoiceId: saved.id,
        invoiceNumber: saved.invoiceNumber,
        filename: file.originalname,
      },
    } as any);

    return saved;
  }

  // ─── Admin: verify payment ─────────────────────────────────────────────

  async verifyPayment(
    invoiceId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<ContractTestInvoice> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot verify payment on cancelled invoice',
      );
    }
    if (!invoice.paymentProofUrl) {
      throw new BadRequestException(
        'Cannot verify payment before customer uploads proof',
      );
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paidAmount = invoice.amountDue;
    invoice.paymentVerifiedAt = new Date();
    invoice.paymentVerifiedBy = adminUserId;
    invoice.paymentVerifiedByName = adminUserName ?? null;
    const saved = await this.repository.save(invoice);

    void this.activityLog.log({
      testingRequestId: invoice.testingScheduleId ?? undefined,
      action: 'contract_test_invoice_payment_verified',
      performedBy: adminUserId,
      performedByName: adminUserName,
      performedByRole: 'admin',
      details: {
        invoiceId: saved.id,
        invoiceNumber: saved.invoiceNumber,
        paidAmount: saved.paidAmount,
      },
    } as any);

    return saved;
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async findAll(options?: {
    status?: string;
    contractId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repository.findAll(options);
  }

  async findById(id: string): Promise<ContractTestInvoice> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findByContractId(contractId: string): Promise<ContractTestInvoice[]> {
    return this.repository.findByContractId(contractId);
  }

  async findByCustomerId(
    customerId: string,
    options?: { status?: string; page?: number; limit?: number },
  ) {
    return this.repository.findByCustomerId(customerId, options);
  }

  async getDownloadUrl(
    invoiceId: string,
  ): Promise<{ url: string; filename: string }> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.invoiceDocumentUrl) {
      throw new NotFoundException('Invoice document not yet generated');
    }
    const url = await this.docHelper.getDownloadUrl(invoice.invoiceDocumentUrl);
    return { url, filename: `${invoice.invoiceNumber}.pdf` };
  }

  async getPaymentProofDownloadUrl(
    invoiceId: string,
  ): Promise<{ url: string; filename: string }> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.paymentProofUrl) {
      throw new NotFoundException('Payment proof not uploaded');
    }
    const url = await this.docHelper.getDownloadUrl(invoice.paymentProofUrl);
    return { url, filename: invoice.paymentProofFilename ?? 'payment-proof' };
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') {
      throw new BadRequestException('Cannot delete a paid invoice');
    }
    return this.repository.softDelete(id);
  }

  private async generateInvoiceNumber(): Promise<string> {
    // generateNextInvoiceNumber() atomically picks the next free
    // CTI-NNNNNN value under a PostgreSQL advisory lock and includes
    // soft-deleted rows in the MAX query, so the sequence never
    // collides with a soft-deleted record's UNIQUE constraint.
    // Format: CTI-NNNNNN (6-digit, no year, monotonic across years).
    return this.repository.generateNextInvoiceNumber();
  }
}
