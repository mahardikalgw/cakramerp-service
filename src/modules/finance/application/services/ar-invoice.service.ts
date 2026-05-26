import { ARInvoiceServicePort } from '../ports/ar-invoice-service.port'
import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  AR_INVOICE_REPOSITORY,
  AR_INVOICE_LINE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  ARInvoiceLineRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
  AccountRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { GlPostingQueueTypeOrmEntity } from '../../infrastructure/entities/gl-posting-queue-typeorm.entity'
import { ARInvoiceTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-typeorm.entity'
import { ARInvoiceLineTypeOrmEntity } from '../../infrastructure/entities/ar-invoice-line-typeorm.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'
import { Repository, DataSource } from 'typeorm'
import { CreateARInvoiceCommand } from '../commands/create-ar-invoice.command'
import { UpdateARInvoiceCommand } from '../commands/update-ar-invoice.command'
import { RecordPaymentCommand } from '../commands/record-payment.command'

export interface InvoiceWithLines {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  customerId?: string
  invoiceDate: string
  dueDate: string
  status: string
  subtotal: number
  taxTotal: number
  additionalDiscount: number
  grandTotal: number
  paidAmount: number
  balance: number
  segment?: string
  projectId?: string
  paymentTermDays?: number
  paymentTermLabel?: string
  glPostingQueueId: string | null
  glPostingQueueStatus: string | null
  journalEntryId: string | null
  journalEntryNumber: string | null
  journalEntryStatus: string | null
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
export class ARInvoiceService implements ARInvoiceServicePort {
  private readonly invoiceRepo: Repository<ARInvoiceTypeOrmEntity>
  private readonly queueRepo: Repository<GlPostingQueueTypeOrmEntity>

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
  ) {
    this.invoiceRepo = dataSource.getRepository(ARInvoiceTypeOrmEntity)
    this.queueRepo = dataSource.getRepository(GlPostingQueueTypeOrmEntity)
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
      data.push(await this.toInvoiceWithLines(inv, lines))
    }

    return { data, total }
  }

  async findById(id: string): Promise<InvoiceWithLines | null> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) return null
    const lines = await this.lineRepo.findByInvoiceId(id)
    return await this.toInvoiceWithLines(inv, lines)
  }

  async create(command: CreateARInvoiceCommand, asDraft = true): Promise<InvoiceWithLines> {
    const invoiceNumber = await this.getNextInvoiceNumber()

    let subtotal = 0
    let taxTotal = 0
    const lineEntities: Partial<ARInvoiceLineTypeOrmEntity>[] = []

    for (const line of command.lines) {
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
    const additionalDiscount = command.additionalDiscount ?? 0
    const finalTotal = grandTotal - additionalDiscount

    const invoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        invoiceNumber,
        clientId: command.clientId,
        clientName: command.clientName,
        customerId: command.customerId,
        projectId: command.projectId,
        segment: command.segment,
        amount: finalTotal,
        paidAmount: 0,
        dueDate: new Date(command.dueDate),
        issueDate: new Date(command.invoiceDate),
        status: asDraft ? 'draft' : 'sent',
        paymentTermDays: command.paymentTermDays,
        paymentTermLabel: command.paymentTermLabel,
        additionalDiscount,
      }),
    )

    const savedLines: ARInvoiceLineTypeOrmEntity[] = []
    for (const line of lineEntities) {
      const saved = await this.lineRepo.save(
        this.lineRepo.create({ ...line, invoiceId: invoice.id }),
      )
      savedLines.push(saved)
    }

    return await this.toInvoiceWithLines(invoice, savedLines)
  }

  async update(id: string, command: UpdateARInvoiceCommand): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) throw new BadRequestException('Invoice not found')
    if (inv.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited')
    }

    if (command.clientId !== undefined) inv.clientId = command.clientId
    if (command.clientName !== undefined) inv.clientName = command.clientName
    if (command.customerId !== undefined) (inv as any).customerId = command.customerId
    if (command.invoiceDate !== undefined) inv.issueDate = new Date(command.invoiceDate)
    if (command.dueDate !== undefined) inv.dueDate = new Date(command.dueDate)
    if (command.segment !== undefined) inv.segment = command.segment
    if (command.projectId !== undefined) inv.projectId = command.projectId
    if (command.paymentTermDays !== undefined) inv.paymentTermDays = command.paymentTermDays
    if (command.paymentTermLabel !== undefined) inv.paymentTermLabel = command.paymentTermLabel
    if (command.additionalDiscount !== undefined) inv.additionalDiscount = command.additionalDiscount

    if (command.lines) {
      const existingLines = await this.lineRepo.findByInvoiceId(id)
      for (const line of existingLines) {
        await this.dataSource.getRepository(ARInvoiceLineTypeOrmEntity).delete(line.id)
      }

      let subtotal = 0
      let taxTotal = 0
      const savedLines: ARInvoiceLineTypeOrmEntity[] = []

      for (const line of command.lines) {
        const lineAmount = line.quantity * line.unitPrice
        const lineTax = lineAmount * (line.taxPercent / 100)
        subtotal += lineAmount
        taxTotal += lineTax

        const saved = await this.lineRepo.save(
          this.lineRepo.create({
            invoiceId: id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxPercent: line.taxPercent,
            amount: lineAmount + lineTax,
          }),
        )
        savedLines.push(saved)
      }

      const discount = Number(inv.additionalDiscount ?? 0)
      inv.amount = subtotal + taxTotal - discount
      const saved = await this.invoiceRepo.save(inv)
      return this.toInvoiceWithLines(saved, savedLines)
    }

    const saved = await this.invoiceRepo.save(inv)
    const lines = await this.lineRepo.findByInvoiceId(id)
    return this.toInvoiceWithLines(saved, lines)
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

    await this.enqueueGlPosting(saved, 'invoice_issued')

    return this.toInvoiceWithLines(saved, lines)
  }

  async recordPayment(id: string, command: RecordPaymentCommand): Promise<InvoiceWithLines> {
    const inv = await this.invoiceRepo.findOne({ where: { id } })
    if (!inv) throw new BadRequestException('Invoice not found')
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      throw new BadRequestException('Cannot record payment on this invoice')
    }

    const newPaidAmount = Number(inv.paidAmount) + command.amount
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

    await this.enqueueGlPosting(saved, 'payment_received', command.amount)

    if (inv.status === 'paid') {
      await this.createPaymentJournalEntry(inv, command)
    }

    const lines = await this.lineRepo.findByInvoiceId(id)
    return this.toInvoiceWithLines(saved, lines)
  }

  private async createPaymentJournalEntry(
    inv: ARInvoiceTypeOrmEntity,
    command: RecordPaymentCommand,
  ): Promise<void> {
    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()

    const arAccount = await this.accountRepo.findByCode('1200')
    const arAccountId = arAccount?.id ?? command.bankAccountId

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(command.paymentDate),
      description: `Payment received for invoice ${inv.invoiceNumber}`,
      reference: command.reference ?? `Sales Invoice ${inv.invoiceNumber}`,
      status: 'approved',
      createdBy: null as any,
      approvedBy: null as any,
      approvedAt: new Date(),
      sourceType: 'sales_invoice',
      sourceId: inv.id,
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    const debitLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: command.bankAccountId,
      debit: new Decimal(command.amount),
      credit: new Decimal(0),
      description: `Payment from ${inv.clientName}`,
    })

    const creditLine = new JournalEntryLine({
      journalEntryId: savedEntry.id,
      accountId: arAccountId,
      debit: new Decimal(0),
      credit: new Decimal(command.amount),
      description: `AR cleared for ${inv.invoiceNumber}`,
    })

    await this.journalLineRepo.save(debitLine)
    await this.journalLineRepo.save(creditLine)

    await this.dataSource.query(
      `UPDATE "ar_invoices" SET "journal_entry_id" = $1 WHERE "id" = $2`,
      [savedEntry.id, inv.id],
    )
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

  async enqueueGlPosting(
    inv: ARInvoiceTypeOrmEntity,
    eventType: 'invoice_issued' | 'payment_received',
    paymentAmount?: number,
  ): Promise<void> {
    const amount = paymentAmount ?? Number(inv.amount)

    let suggestedLines: Record<string, unknown>[]
    if (eventType === 'payment_received') {
      suggestedLines = [
        { accountId: '', accountCode: '1100', accountName: 'Bank / Cash', debit: amount, credit: 0, description: `Payment from ${inv.clientName}` },
        { accountId: '', accountCode: '1200', accountName: 'Accounts Receivable', debit: 0, credit: amount, description: `Settle ${inv.invoiceNumber}` },
      ]
    } else {
      suggestedLines = [
        { accountId: '', accountCode: '1200', accountName: 'Accounts Receivable', debit: amount, credit: 0, description: `Revenue - ${inv.invoiceNumber}` },
        { accountId: '', accountCode: '4100', accountName: 'Sales Revenue', debit: 0, credit: amount, description: `Revenue on ${inv.invoiceNumber}` },
      ]
    }

    const existing = await this.queueRepo.findOne({
      where: { sourceType: 'sales_invoice', sourceId: inv.id, eventType },
    })
    if (existing) return

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
      }),
    )
  }

  private async toInvoiceWithLines(
    inv: ARInvoiceTypeOrmEntity,
    lines: ARInvoiceLineTypeOrmEntity[],
  ): Promise<InvoiceWithLines> {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    const taxTotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice * (l.taxPercent / 100),
      0,
    )
    const additionalDiscount = Number(inv.additionalDiscount ?? 0)

    let glPostingQueueId: string | null = null
    let glPostingQueueStatus: string | null = null
    let journalEntryId: string | null = (inv as any).journalEntryId ?? null
    let journalEntryNumber: string | null = null
    let journalEntryStatus: string | null = null

    try {
      const pq = await this.queueRepo.findOne({
        where: { sourceType: 'sales_invoice', sourceId: inv.id, status: 'pending' },
        order: { createdAt: 'DESC' },
      })
      if (pq) {
        glPostingQueueId = pq.id
        glPostingQueueStatus = pq.status
      }
    } catch {}

    if (journalEntryId) {
      try {
        const rows = await this.dataSource.query(
          `SELECT entry_number, status FROM journal_entries WHERE id = $1 LIMIT 1`,
          [journalEntryId],
        )
        if (rows.length > 0) {
          journalEntryNumber = rows[0].entry_number
          journalEntryStatus = rows[0].status
        }
      } catch {}
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