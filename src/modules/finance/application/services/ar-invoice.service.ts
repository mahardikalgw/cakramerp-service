import { Decimal } from 'decimal.js';
import { ARInvoiceServicePort } from '../ports/ar-invoice-service.port';
import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AR_INVOICE_LINE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import type {
  ARInvoiceLineRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
  AccountRepositoryPort,
} from '../../domain/repositories/finance-repository.port';
import { GlPostingQueueTypeOrmEntity } from '../../infrastructure/entities/gl-posting-queue-typeorm.entity';
import { ARInvoiceTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-typeorm.entity';
import { ARInvoiceLineTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-line-typeorm.entity';
import { JournalEntry } from '../../domain/entities/journal-entry.entity';
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity';
import { Repository, DataSource } from 'typeorm';
import { CreateARInvoiceCommand } from '../commands/create-ar-invoice.command';
import { UpdateARInvoiceCommand } from '../commands/update-ar-invoice.command';
import { RecordPaymentCommand } from '../commands/record-payment.command';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';
import { MinioClientService } from '../../../shared/infrastructure/document-generation/minio-client.service';

export interface InvoiceWithLines {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  customerId?: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  additionalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  segment?: string;
  projectId?: string;
  paymentTermDays?: number;
  paymentTermLabel?: string;
  glPostingQueueId: string | null;
  glPostingQueueStatus: string | null;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
  journalEntryStatus: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  contractId?: string | null;
  testingScheduleId?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  totalSamples?: number;
  initialFeeApplied?: number;
  amountDue?: number | null;
  paymentProofUrl?: string | null;
  paymentProofFilename?: string | null;
  paymentProofUploadedAt?: Date | string | null;
  paymentVerifiedAt?: Date | string | null;
  paymentVerifiedBy?: string | null;
  paymentVerifiedByName?: string | null;
  lines: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    amount: number;
    testResultId?: string | null;
    sampleCode?: string | null;
  }[];
}

@Injectable()
export class ARInvoiceService implements ARInvoiceServicePort {
  private readonly invoiceRepo: Repository<ARInvoiceTypeOrmEntity>;
  private readonly queueRepo: Repository<GlPostingQueueTypeOrmEntity>;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(AR_INVOICE_LINE_REPOSITORY)
    private readonly lineRepo: ARInvoiceLineRepositoryPort,
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioService: MinioClientService,
  ) {
    this.invoiceRepo = dataSource.getRepository(ARInvoiceTypeOrmEntity);
    this.queueRepo = dataSource.getRepository(GlPostingQueueTypeOrmEntity);
  }

  async findAll(filters?: {
    status?: string;
    clientId?: string;
    customerId?: string;
    sourceType?: string;
    contractId?: string;
    testingScheduleId?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: InvoiceWithLines[]; total: number }> {
    const qb = this.invoiceRepo.createQueryBuilder('inv');

    if (filters?.status) {
      qb.andWhere('inv.status = :status', { status: filters.status });
    }
    if (filters?.clientId) {
      qb.andWhere('inv.clientId = :clientId', { clientId: filters.clientId });
    }
    if (filters?.customerId) {
      qb.andWhere('inv.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters?.sourceType) {
      qb.andWhere('inv.sourceType = :sourceType', {
        sourceType: filters.sourceType,
      });
    }
    if (filters?.contractId) {
      qb.andWhere('inv.contractId = :contractId', {
        contractId: filters.contractId,
      });
    }
    if (filters?.testingScheduleId) {
      qb.andWhere('inv.testingScheduleId = :testingScheduleId', {
        testingScheduleId: filters.testingScheduleId,
      });
    }
    if (filters?.billingPeriodStart) {
      qb.andWhere('inv.billingPeriodStart = :billingPeriodStart', {
        billingPeriodStart: filters.billingPeriodStart,
      });
    }
    if (filters?.billingPeriodEnd) {
      qb.andWhere('inv.billingPeriodEnd = :billingPeriodEnd', {
        billingPeriodEnd: filters.billingPeriodEnd,
      });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('inv.issueDate', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [entities, total] = await qb.getManyAndCount();

    // Parallelize: fetch all lines + enrichment in parallel instead of sequentially
    const data = await Promise.all(
      entities.map(async (inv) => {
        const lines = await this.lineRepo.findByInvoiceId(inv.id);
        return this.toInvoiceWithLines(inv, lines);
      }),
    );

    return { data, total };
  }

  async findById(id: string): Promise<InvoiceWithLines | null> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) return null;
    const lines = await this.lineRepo.findByInvoiceId(id);
    return await this.toInvoiceWithLines(inv, lines);
  }

  async findBySalesOrderId(
    salesOrderId: string,
  ): Promise<InvoiceWithLines | null> {
    const inv = await this.invoiceRepo.findOne({ where: { salesOrderId } });
    if (!inv) return null;
    const lines = await this.lineRepo.findByInvoiceId(inv.id);
    return await this.toInvoiceWithLines(inv, lines);
  }

  async create(
    command: CreateARInvoiceCommand,
    asDraft = true,
  ): Promise<InvoiceWithLines> {
    const invoiceNumber = await this.getNextInvoiceNumber();

    let subtotal = 0;
    let taxTotal = 0;
    const lineEntities: Partial<ARInvoiceLineTypeOrmEntity>[] = [];

    for (const line of command.lines) {
      const lineAmount = line.quantity * line.unitPrice;
      const lineTax = lineAmount * (line.taxPercent / 100);
      subtotal += lineAmount;
      taxTotal += lineTax;
      lineEntities.push({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxPercent: line.taxPercent,
        amount: lineAmount + lineTax,
        testResultId: (line as any).testResultId ?? null,
        sampleCode: (line as any).sampleCode ?? null,
      });
    }

    const grandTotal = subtotal + taxTotal;
    const additionalDiscount = command.additionalDiscount ?? 0;
    const finalTotal = grandTotal - additionalDiscount;

    // Initial fee credit application (lab contract billing). If the credit
    // covers the full amount the invoice is auto-marked paid.
    const initialFeeApplied = Number(command.initialFeeApplied ?? 0);
    const amountDue = Math.max(
      0,
      Math.round((finalTotal - initialFeeApplied) * 100) / 100,
    );
    const fullyPaidByCredit = finalTotal > 0 && amountDue <= 0;
    const status = fullyPaidByCredit ? 'paid' : asDraft ? 'draft' : 'sent';

    const invoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        invoiceNumber,
        clientId: command.clientId,
        clientName: command.clientName,
        customerId: command.customerId,
        projectId: command.projectId,
        segment: command.segment,
        amount: finalTotal,
        paidAmount: fullyPaidByCredit ? finalTotal : 0,
        dueDate: new Date(command.dueDate),
        issueDate: new Date(command.invoiceDate),
        status,
        paymentTermDays: command.paymentTermDays,
        paymentTermLabel: command.paymentTermLabel,
        additionalDiscount,
        sourceType: command.sourceType ?? null,
        sourceId: command.sourceId ?? null,
        contractId: command.contractId ?? null,
        testingScheduleId: command.testingScheduleId ?? null,
        billingPeriodStart: command.billingPeriodStart
          ? new Date(command.billingPeriodStart)
          : null,
        billingPeriodEnd: command.billingPeriodEnd
          ? new Date(command.billingPeriodEnd)
          : null,
        totalSamples: command.totalSamples ?? 0,
        initialFeeApplied,
        amountDue,
        paidAt: fullyPaidByCredit ? new Date() : null,
        paymentVerifiedAt: fullyPaidByCredit ? new Date() : null,
      }),
    );

    const savedLines: ARInvoiceLineTypeOrmEntity[] = [];
    for (const line of lineEntities) {
      const saved = await this.lineRepo.save(
        this.lineRepo.create({ ...line, invoiceId: invoice.id }),
      );
      savedLines.push(saved);
    }

    return await this.toInvoiceWithLines(invoice, savedLines);
  }

  async update(
    id: string,
    command: UpdateARInvoiceCommand,
  ): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    if (command.clientId !== undefined) inv.clientId = command.clientId;
    if (command.clientName !== undefined) inv.clientName = command.clientName;
    if (command.customerId !== undefined)
      (inv as any).customerId = command.customerId;
    if (command.invoiceDate !== undefined)
      inv.issueDate = new Date(command.invoiceDate);
    if (command.dueDate !== undefined) inv.dueDate = new Date(command.dueDate);
    if (command.segment !== undefined) inv.segment = command.segment;
    if (command.projectId !== undefined) inv.projectId = command.projectId;
    if (command.paymentTermDays !== undefined)
      inv.paymentTermDays = command.paymentTermDays;
    if (command.paymentTermLabel !== undefined)
      inv.paymentTermLabel = command.paymentTermLabel;
    if (command.additionalDiscount !== undefined)
      inv.additionalDiscount = command.additionalDiscount;

    if (command.lines) {
      const existingLines = await this.lineRepo.findByInvoiceId(id);
      for (const line of existingLines) {
        await this.dataSource
          .getRepository(ARInvoiceLineTypeOrmEntity)
          .delete(line.id);
      }

      let subtotal = 0;
      let taxTotal = 0;
      const savedLines: ARInvoiceLineTypeOrmEntity[] = [];

      for (const line of command.lines) {
        const lineAmount = line.quantity * line.unitPrice;
        const lineTax = lineAmount * (line.taxPercent / 100);
        subtotal += lineAmount;
        taxTotal += lineTax;

        const saved = await this.lineRepo.save(
          this.lineRepo.create({
            invoiceId: id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxPercent: line.taxPercent,
            amount: lineAmount + lineTax,
          }),
        );
        savedLines.push(saved);
      }

      const discount = Number(inv.additionalDiscount ?? 0);
      inv.amount = subtotal + taxTotal - discount;
      const saved = await this.invoiceRepo.save(inv);
      return this.toInvoiceWithLines(saved, savedLines);
    }

    const saved = await this.invoiceRepo.save(inv);
    const lines = await this.lineRepo.findByInvoiceId(id);
    return this.toInvoiceWithLines(saved, lines);
  }

  async send(id: string): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be sent');
    }

    inv.status = 'sent';
    const saved = await this.invoiceRepo.save(inv);
    const lines = await this.lineRepo.findByInvoiceId(id);

    await this.enqueueGlPosting(saved, 'invoice_issued');

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.SALES_INVOICE,
      entityId: id,
      tenantId: 'default',
      requestedBy: 'system',
      outputFormat: 'pdf',
    });

    return this.toInvoiceWithLines(saved, lines);
  }

  async recordPayment(
    id: string,
    command: RecordPaymentCommand,
  ): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      throw new BadRequestException('Cannot record payment on this invoice');
    }

    const newPaidAmount = Number(inv.paidAmount) + command.amount;
    const balance = Number(inv.amount) - newPaidAmount;

    if (newPaidAmount > Number(inv.amount)) {
      throw new BadRequestException('Payment amount exceeds invoice balance');
    }

    inv.paidAmount = newPaidAmount;
    if (balance <= 0.01) {
      inv.status = 'paid';
    } else {
      inv.status = 'partially_paid';
    }

    const saved = await this.invoiceRepo.save(inv);

    await this.enqueueGlPosting(saved, 'payment_received', command.amount);

    if (inv.status === 'paid') {
      await this.createPaymentJournalEntry(inv, command);
    }

    const lines = await this.lineRepo.findByInvoiceId(id);
    return this.toInvoiceWithLines(saved, lines);
  }

  async verifyLabPayment(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (inv.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot verify payment on cancelled invoice',
      );
    }
    if (!inv.paymentProofUrl) {
      throw new BadRequestException(
        'Cannot verify payment before customer uploads proof',
      );
    }

    const amountDue = Number(inv.amountDue ?? inv.amount);
    inv.status = 'paid';
    inv.paidAt = new Date();
    inv.paidAmount = amountDue;
    inv.paymentVerifiedAt = new Date();
    inv.paymentVerifiedBy = adminUserId;
    inv.paymentVerifiedByName = adminUserName ?? null;

    const saved = await this.invoiceRepo.save(inv);

    // Record the GL posting for the received payment.
    await this.enqueueGlPosting(saved, 'payment_received', amountDue);

    const lines = await this.lineRepo.findByInvoiceId(id);
    return this.toInvoiceWithLines(saved, lines);
  }

  async findByContractId(contractId: string): Promise<InvoiceWithLines[]> {
    const entities = await this.invoiceRepo.find({
      where: { contractId } as any,
      order: { issueDate: 'DESC' },
    });
    return Promise.all(
      entities.map(async (inv) => {
        const lines = await this.lineRepo.findByInvoiceId(inv.id);
        return this.toInvoiceWithLines(inv, lines);
      }),
    );
  }

  async findByCustomerId(
    customerId: string,
    options?: { status?: string; page?: number; limit?: number },
  ): Promise<{ data: InvoiceWithLines[]; total: number }> {
    const filters: {
      status?: string;
      customerId?: string;
      page?: number;
      limit?: number;
    } = { customerId, page: options?.page, limit: options?.limit };
    if (options?.status) filters.status = options.status;
    return this.findAll(filters);
  }

  async getDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (!inv.invoiceDocumentUrl) {
      throw new NotFoundException('Invoice document not yet generated');
    }
    const url = await this.docHelper.getDownloadUrl(inv.invoiceDocumentUrl);
    return { url, filename: `${inv.invoiceNumber}.pdf` };
  }

  async uploadPaymentProof(
    id: string,
    file: any,
    _userId: string,
    _userName?: string,
  ): Promise<InvoiceWithLines> {
    if (!file) throw new BadRequestException('Payment proof file is required');
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status !== 'issued' && inv.status !== 'overdue') {
      throw new BadRequestException(
        `Cannot upload proof for invoice in status: ${inv.status}`,
      );
    }

    const objectName = `ar-invoices/${id}/${Date.now()}_${file.originalname}`;
    const url = await this.minioService.uploadFile(
      'documents',
      objectName,
      file.buffer,
      file.mimetype,
    );
    inv.paymentProofUrl = url;
    inv.paymentProofFilename = file.originalname;
    inv.paymentProofUploadedAt = new Date();

    const saved = await this.invoiceRepo.save(inv);
    const lines = await this.lineRepo.findByInvoiceId(id);
    return this.toInvoiceWithLines(saved, lines);
  }

  async getPaymentProofDownloadUrl(
    id: string,
  ): Promise<{ url: string; filename: string }> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (!inv.paymentProofUrl) {
      throw new NotFoundException('Payment proof not uploaded');
    }
    const url = await this.docHelper.getDownloadUrl(inv.paymentProofUrl);
    return { url, filename: inv.paymentProofFilename ?? 'payment-proof' };
  }

  async delete(id: string): Promise<void> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status === 'paid') {
      throw new BadRequestException('Cannot delete a paid invoice');
    }
    await this.invoiceRepo.softDelete(id);
  }

  async markAsPaid(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } });
    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (inv.status === 'cancelled') {
      throw new BadRequestException('Cannot mark cancelled invoice as paid');
    }

    const amount = Number(inv.amountDue ?? inv.amount);
    inv.status = 'paid';
    inv.paidAt = new Date();
    inv.paidAmount = amount;
    inv.paymentVerifiedAt = new Date();
    inv.paymentVerifiedBy = adminUserId;
    inv.paymentVerifiedByName = adminUserName ?? null;

    const saved = await this.invoiceRepo.save(inv);
    await this.enqueueGlPosting(saved, 'payment_received', amount);

    const lines = await this.lineRepo.findByInvoiceId(id);
    return this.toInvoiceWithLines(saved, lines);
  }

  async markAsPaidBySalesOrderId(
    salesOrderId: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<InvoiceWithLines | null> {
    const inv = await this.invoiceRepo.findOne({ where: { salesOrderId } });
    if (!inv) return null;
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      const lines = await this.lineRepo.findByInvoiceId(inv.id);
      return this.toInvoiceWithLines(inv, lines);
    }

    const amount = Number(inv.amountDue ?? inv.amount);
    inv.status = 'paid';
    inv.paidAt = new Date();
    inv.paidAmount = amount;
    inv.paymentVerifiedAt = new Date();
    inv.paymentVerifiedBy = adminUserId;
    inv.paymentVerifiedByName = adminUserName ?? null;

    const saved = await this.invoiceRepo.save(inv);

    const lines = await this.lineRepo.findByInvoiceId(inv.id);
    return this.toInvoiceWithLines(saved, lines);
  }

  private async createPaymentJournalEntry(
    inv: ARInvoiceTypeOrmEntity,
    command: RecordPaymentCommand,
  ): Promise<void> {
    const entryNumber = await this.journalEntryRepo.getNextEntryNumber();

    const arAccount = await this.accountRepo.findByCode('1200');
    const arAccountId = arAccount?.id ?? command.bankAccountId;

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(command.paymentDate),
      description: `Payment received for invoice ${inv.invoiceNumber}`,
      reference: command.reference ?? `Sales Invoice ${inv.invoiceNumber}`,
      status: 'approved',
      createdBy: undefined,
      approvedBy: undefined,
      approvedAt: new Date(),
      sourceType: 'sales_invoice',
      sourceId: inv.id,
    });

    const savedEntry = await this.journalEntryRepo.save(entry);

    const debitLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: command.bankAccountId,
      debit: new Decimal(command.amount),
      credit: new Decimal(0),
      description: `Payment from ${inv.clientName}`,
    });

    const creditLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: arAccountId,
      debit: new Decimal(0),
      credit: new Decimal(command.amount),
      description: `AR cleared for ${inv.invoiceNumber}`,
    });

    await this.journalLineRepo.save(debitLine);
    await this.journalLineRepo.save(creditLine);

    await this.dataSource.query(
      `UPDATE "ar_invoices" SET "journal_entry_id" = $1 WHERE "id" = $2`,
      [savedEntry.id, inv.id],
    );
  }

  private async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('inv.invoiceNumber', 'DESC')
      .getOne();

    if (!last) return `${prefix}0001`;
    const seq = parseInt(last.invoiceNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async enqueueGlPosting(
    inv: ARInvoiceTypeOrmEntity,
    eventType: 'invoice_issued' | 'payment_received',
    paymentAmount?: number,
  ): Promise<void> {
    const amount = paymentAmount ?? Number(inv.amount);

    let suggestedLines: Record<string, unknown>[];
    if (eventType === 'payment_received') {
      suggestedLines = [
        {
          accountId: '',
          accountCode: '1100',
          accountName: 'Bank / Cash',
          debit: amount,
          credit: 0,
          description: `Payment from ${inv.clientName}`,
        },
        {
          accountId: '',
          accountCode: '1200',
          accountName: 'Accounts Receivable',
          debit: 0,
          credit: amount,
          description: `Settle ${inv.invoiceNumber}`,
        },
      ];
    } else {
      suggestedLines = [
        {
          accountId: '',
          accountCode: '1200',
          accountName: 'Accounts Receivable',
          debit: amount,
          credit: 0,
          description: `Revenue - ${inv.invoiceNumber}`,
        },
        {
          accountId: '',
          accountCode: '4100',
          accountName: 'Sales Revenue',
          debit: 0,
          credit: amount,
          description: `Revenue on ${inv.invoiceNumber}`,
        },
      ];
    }

    const existing = await this.queueRepo.findOne({
      where: { sourceType: 'sales_invoice', sourceId: inv.id, eventType },
    });
    if (existing) return;

    await this.queueRepo.save(
      this.queueRepo.create({
        sourceType: 'sales_invoice',
        sourceId: inv.id,
        sourceNumber: inv.invoiceNumber,
        eventType,
        amount,
        description: `${inv.invoiceNumber} - ${inv.clientName}`,
        suggestedLines,
        status: 'pending',
        customerId: inv.customerId || inv.clientId,
        invoiceId: inv.id,
      }),
    );
  }

  private async toInvoiceWithLines(
    inv: ARInvoiceTypeOrmEntity,
    lines: ARInvoiceLineTypeOrmEntity[],
  ): Promise<InvoiceWithLines> {
    const subtotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice,
      0,
    );
    const taxTotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice * (l.taxPercent / 100),
      0,
    );
    const additionalDiscount = Number(inv.additionalDiscount ?? 0);

    let glPostingQueueId: string | null = null;
    let glPostingQueueStatus: string | null = null;
    const journalEntryId: string | null = (inv as any).journalEntryId ?? null;
    let journalEntryNumber: string | null = null;
    let journalEntryStatus: string | null = null;

    try {
      const pq = await this.queueRepo.findOne({
        where: {
          sourceType: 'sales_invoice',
          sourceId: inv.id,
          status: 'pending',
        },
        order: { createdAt: 'DESC' },
      });
      if (pq) {
        glPostingQueueId = pq.id;
        glPostingQueueStatus = pq.status;
      }
    } catch {
      // ignore GL posting queue query errors
    }

    if (journalEntryId) {
      try {
        const rows = await this.dataSource.query(
          `SELECT entry_number, status FROM journal_entries WHERE id = $1 LIMIT 1`,
          [journalEntryId],
        );
        if (rows.length > 0) {
          journalEntryNumber = rows[0].entry_number;
          journalEntryStatus = rows[0].status;
        }
      } catch {
        // ignore GL posting queue query errors
      }
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.clientName,
      customerId: inv.customerId ?? undefined,
      invoiceDate: inv.issueDate?.toISOString?.() ?? String(inv.issueDate),
      dueDate: inv.dueDate?.toISOString?.() ?? String(inv.dueDate),
      status: inv.status,
      subtotal,
      taxTotal,
      additionalDiscount,
      grandTotal: Number(inv.amount),
      paidAmount: Number(inv.paidAmount),
      balance: Number(inv.amount) - Number(inv.paidAmount),
      segment: inv.segment ?? undefined,
      projectId: inv.projectId ?? undefined,
      paymentTermDays: inv.paymentTermDays ?? undefined,
      paymentTermLabel: inv.paymentTermLabel ?? undefined,
      glPostingQueueId,
      glPostingQueueStatus,
      journalEntryId,
      journalEntryNumber,
      journalEntryStatus,
      sourceType: inv.sourceType ?? undefined,
      sourceId: inv.sourceId ?? undefined,
      contractId: inv.contractId ?? undefined,
      testingScheduleId: inv.testingScheduleId ?? undefined,
      billingPeriodStart: inv.billingPeriodStart
        ? (inv.billingPeriodStart.toISOString?.() ??
          String(inv.billingPeriodStart))
        : null,
      billingPeriodEnd: inv.billingPeriodEnd
        ? (inv.billingPeriodEnd.toISOString?.() ?? String(inv.billingPeriodEnd))
        : null,
      totalSamples: Number(inv.totalSamples ?? 0),
      initialFeeApplied: Number(inv.initialFeeApplied ?? 0),
      amountDue:
        inv.amountDue != null ? Number(inv.amountDue) : Number(inv.amount),
      paymentProofUrl: inv.paymentProofUrl ?? undefined,
      paymentProofFilename: inv.paymentProofFilename ?? undefined,
      paymentProofUploadedAt: inv.paymentProofUploadedAt ?? undefined,
      paymentVerifiedAt: inv.paymentVerifiedAt ?? undefined,
      paymentVerifiedBy: inv.paymentVerifiedBy ?? undefined,
      paymentVerifiedByName: inv.paymentVerifiedByName ?? undefined,
      lines: lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxPercent: Number(l.taxPercent),
        amount: Number(l.amount),
        testResultId: l.testResultId ?? undefined,
        sampleCode: l.sampleCode ?? undefined,
      })),
    };
  }
}
