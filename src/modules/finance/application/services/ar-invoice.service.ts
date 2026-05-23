import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  AR_INVOICE_REPOSITORY,
  AR_INVOICE_LINE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  ARInvoiceLineRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { ARInvoiceTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-typeorm.entity'
import { ARInvoiceLineTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-line-typeorm.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'
import { Repository, DataSource } from 'typeorm'

export interface CreateInvoiceDto {
  clientId: string
  clientName: string
  invoiceDate: string
  dueDate: string
  segment?: string
  projectId?: string
  sendEmail?: boolean
  lines: {
    description: string
    quantity: number
    unitPrice: number
    taxPercent: number
  }[]
}

export interface RecordPaymentDto {
  amount: number
  paymentDate: string
  bankAccountId: string
  reference?: string
}

export interface InvoiceWithLines {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  invoiceDate: string
  dueDate: string
  status: string
  subtotal: number
  taxTotal: number
  grandTotal: number
  paidAmount: number
  balance: number
  segment?: string
  projectId?: string
  lines: {
    id: string
    description: string
    quantity: number
    unitPrice: number
    taxPercent: number
    amount: number
  }[]
}

@Injectable()
export class ARInvoiceService {
  private readonly invoiceRepo: Repository<ARInvoiceTypeOrmEntity>

  constructor(
    private readonly dataSource: DataSource,
    @Inject(AR_INVOICE_LINE_REPOSITORY)
    private readonly lineRepo: ARInvoiceLineRepositoryPort,
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {
    this.invoiceRepo = dataSource.getRepository(ARInvoiceTypeOrmEntity)
  }

  async findAll(filters?: {
    status?: string
    clientId?: string
    page?: number
    limit?: number
  }): Promise<{ data: InvoiceWithLines[]; total: number }> {
    const qb = this.invoiceRepo.createQueryBuilder('inv')

    if (filters?.status) {
      qb.andWhere('inv.status = :status', { status: filters.status })
    }
    if (filters?.clientId) {
      qb.andWhere('inv.clientId = :clientId', { clientId: filters.clientId })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    qb.orderBy('inv.issueDate', 'DESC')
    qb.skip((page - 1) * limit).take(limit)

    const [entities, total] = await qb.getManyAndCount()

    const data: InvoiceWithLines[] = []
    for (const inv of entities) {
      const lines = await this.lineRepo.findByInvoiceId(inv.id)
      data.push(this.toInvoiceWithLines(inv, lines))
    }

    return { data, total }
  }

  async findById(id: string): Promise<InvoiceWithLines | null> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) return null
    const lines = await this.lineRepo.findByInvoiceId(id)
    return this.toInvoiceWithLines(inv, lines)
  }

  async create(dto: CreateInvoiceDto, asDraft = true): Promise<InvoiceWithLines> {
    const invoiceNumber = await this.getNextInvoiceNumber()

    // Calculate totals
    let subtotal = 0
    let taxTotal = 0
    const lineEntities: Partial<ARInvoiceLineTypeOrmEntity>[] = []

    for (const line of dto.lines) {
      const lineAmount = line.quantity * line.unitPrice
      const lineTax = lineAmount * (line.taxPercent / 100)
      subtotal += lineAmount
      taxTotal += lineTax
      lineEntities.push({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxPercent: line.taxPercent,
        amount: lineAmount + lineTax,
      })
    }

    const grandTotal = subtotal + taxTotal

    const invoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        invoiceNumber,
        clientId: dto.clientId,
        clientName: dto.clientName,
        projectId: dto.projectId,
        segment: dto.segment,
        amount: grandTotal,
        paidAmount: 0,
        dueDate: new Date(dto.dueDate),
        issueDate: new Date(dto.invoiceDate),
        status: asDraft ? 'draft' : 'sent',
      }),
    )

    const savedLines: ARInvoiceLineTypeOrmEntity[] = []
    for (const line of lineEntities) {
      const saved = await this.lineRepo.save(
        this.lineRepo.create({ ...line, invoiceId: invoice.id }),
      )
      savedLines.push(saved)
    }

    return this.toInvoiceWithLines(invoice, savedLines)
  }

  async send(id: string): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) throw new BadRequestException('Invoice not found')
    if (inv.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be sent')
    }

    inv.status = 'sent'
    const saved = await this.invoiceRepo.save(inv)
    const lines = await this.lineRepo.findByInvoiceId(id)

    // TODO: Queue email job with PDF attachment
    return this.toInvoiceWithLines(saved, lines)
  }

  async recordPayment(id: string, dto: RecordPaymentDto): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) throw new BadRequestException('Invoice not found')
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      throw new BadRequestException('Cannot record payment on this invoice')
    }

    const newPaidAmount = Number(inv.paidAmount) + dto.amount
    const balance = Number(inv.amount) - newPaidAmount

    if (newPaidAmount > Number(inv.amount)) {
      throw new BadRequestException('Payment amount exceeds invoice balance')
    }

    inv.paidAmount = newPaidAmount
    if (balance <= 0.01) {
      inv.status = 'paid'
    } else {
      inv.status = 'partially_paid'
    }

    const saved = await this.invoiceRepo.save(inv)

    // Auto-create GL journal entry on full payment
    if (inv.status === 'paid') {
      await this.createPaymentJournalEntry(inv, dto)
    }

    const lines = await this.lineRepo.findByInvoiceId(id)
    return this.toInvoiceWithLines(saved, lines)
  }

  private async createPaymentJournalEntry(
    inv: ARInvoiceTypeOrmEntity,
    dto: RecordPaymentDto,
  ): Promise<void> {
    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(dto.paymentDate),
      description: `Payment received for invoice ${inv.invoiceNumber}`,
      reference: dto.reference ?? inv.invoiceNumber,
      status: 'approved',
      createdBy: 'system',
      approvedBy: 'system',
      approvedAt: new Date(),
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    // Debit: Cash/Bank, Credit: AR
    const debitLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: dto.bankAccountId,
      debit: new Decimal(dto.amount),
      credit: new Decimal(0),
      description: `Payment from ${inv.clientName}`,
    })

    // For AR credit, we'd need the AR account ID - use a convention
    const creditLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: dto.bankAccountId, // TODO: Replace with AR account lookup
      debit: new Decimal(0),
      credit: new Decimal(dto.amount),
      description: `AR cleared for ${inv.invoiceNumber}`,
    })

    await this.journalLineRepo.save(debitLine)
    await this.journalLineRepo.save(creditLine)
  }

  private async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `INV-${year}-`
    const last = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('inv.invoiceNumber', 'DESC')
      .getOne()

    if (!last) return `${prefix}0001`
    const seq = parseInt(last.invoiceNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }

  private toInvoiceWithLines(
    inv: ARInvoiceTypeOrmEntity,
    lines: ARInvoiceLineTypeOrmEntity[],
  ): InvoiceWithLines {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    const taxTotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice * (l.taxPercent / 100),
      0,
    )

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.clientName,
      invoiceDate: inv.issueDate?.toISOString?.() ?? String(inv.issueDate),
      dueDate: inv.dueDate?.toISOString?.() ?? String(inv.dueDate),
      status: inv.status,
      subtotal,
      taxTotal,
      grandTotal: Number(inv.amount),
      paidAmount: Number(inv.paidAmount),
      balance: Number(inv.amount) - Number(inv.paidAmount),
      segment: inv.segment ?? undefined,
      projectId: inv.projectId ?? undefined,
      lines: lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxPercent: Number(l.taxPercent),
        amount: Number(l.amount),
      })),
    }
  }
}
