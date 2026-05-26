import { APInvoiceServicePort } from '../ports/ap-invoice-service.port'
import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  AP_INVOICE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  APInvoiceRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
  AccountRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { APInvoiceTypeOrmEntity } from '../../infrastructure/entities/ap-invoice-typeorm.entity'
import { GlPostingQueueTypeOrmEntity } from '../../infrastructure/entities/gl-posting-queue-typeorm.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'
import { Repository, DataSource } from 'typeorm'

export interface CreateAPInvoiceDto {
  vendorId: string
  vendorName: string
  supplierId?: string
  supplierInvoiceNumber?: string
  poReferenceId?: string
  grnReferenceId?: string
  invoiceDate: string
  dueDate: string
  amount: number
  paymentTermDays?: number
  paymentTermLabel?: string
  additionalDiscount?: number
  lines?: { description: string; amount: number }[]
}

export interface SchedulePaymentDto {
  dueDate: string
  bankAccountId: string
}

export interface BulkPaymentDto {
  invoiceIds: string[]
  bankAccountId: string
  paymentDate: string
  reference?: string
}

export interface APInvoiceResponse {
  id: string
  invoiceNumber: string
  vendorId: string
  vendorName: string
  supplierId?: string
  supplierInvoiceNumber?: string
  poReferenceId?: string
  grnReferenceId?: string
  amount: number
  paidAmount: number
  balance: number
  additionalDiscount: number
  invoiceDate: string
  dueDate: string
  status: string
  threeWayMatchStatus: string
  scheduledPaymentDate?: string
  bankAccountId?: string
  paymentTermDays?: number
  paymentTermLabel?: string
  glPostingQueueId: string | null
  glPostingQueueStatus: string | null
  journalEntryId: string | null
  journalEntryNumber: string | null
  journalEntryStatus: string | null
}

@Injectable()
export class APInvoiceService implements APInvoiceServicePort {
  private readonly queueRepo: Repository<GlPostingQueueTypeOrmEntity>

  constructor(
    @Inject(AP_INVOICE_REPOSITORY)
    private readonly repo: APInvoiceRepositoryPort,
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    private readonly dataSource: DataSource,
  ) {
    this.queueRepo = dataSource.getRepository(GlPostingQueueTypeOrmEntity)
  }

  async findAll(filters?: {
    vendorId?: string
    status?: string
    dueDateFrom?: string
    dueDateTo?: string
    page?: number
    limit?: number
  }): Promise<{ data: APInvoiceResponse[]; total: number }> {
    const { data: entities, total } = await this.repo.findAll(filters)
    const data = await Promise.all(entities.map((e: any) => this.toResponse(e)))
    return { data, total }
  }

  async findById(id: string): Promise<APInvoiceResponse | null> {
    const entity = await this.repo.findById(id)
    return entity ? await this.toResponse(entity) : null
  }

  async create(dto: CreateAPInvoiceDto): Promise<APInvoiceResponse> {
    const invoiceNumber = await this.repo.getNextInvoiceNumber()

    let threeWayMatchStatus = 'pending'
    if (dto.poReferenceId && dto.grnReferenceId) {
      threeWayMatchStatus = 'matched'
    } else if (dto.poReferenceId || dto.grnReferenceId) {
      threeWayMatchStatus = 'partial'
    }

    const additionalDiscount = dto.additionalDiscount ?? 0
    const finalAmount = dto.amount - additionalDiscount

    const entity = await this.repo.save(
      this.repo.create({
        invoiceNumber,
        vendorId: dto.vendorId,
        vendorName: dto.vendorName,
        supplierId: dto.supplierId,
        supplierInvoiceNumber: dto.supplierInvoiceNumber,
        poReferenceId: dto.poReferenceId,
        grnReferenceId: dto.grnReferenceId,
        amount: finalAmount,
        paidAmount: 0,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        status: 'pending',
        threeWayMatchStatus,
        paymentTermDays: dto.paymentTermDays,
        paymentTermLabel: dto.paymentTermLabel,
        additionalDiscount,
      }),
    )

    await this.enqueueGlPosting(entity, 'invoice_recorded')

    return await this.toResponse(entity)
  }

  async schedulePayment(id: string, dto: SchedulePaymentDto): Promise<APInvoiceResponse> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new BadRequestException('AP Invoice not found')

    entity.scheduledPaymentDate = new Date(dto.dueDate)
    entity.bankAccountId = dto.bankAccountId
    const saved = await this.repo.save(entity)
    return await this.toResponse(saved)
  }

  async bulkPayment(dto: BulkPaymentDto): Promise<{ paid: number; totalAmount: number }> {
    const invoices = await this.repo.findByIds(dto.invoiceIds)

    if (invoices.length === 0) {
      throw new BadRequestException('No invoices found')
    }

    const vendorIds = new Set(invoices.map((i: APInvoiceTypeOrmEntity) => i.vendorId))
    if (vendorIds.size > 1) {
      throw new BadRequestException('Bulk payment only allowed for invoices from the same vendor')
    }

    let totalAmount = 0

    for (const inv of invoices) {
      const balance = Number(inv.amount) - Number(inv.paidAmount)
      inv.paidAmount = Number(inv.amount)
      inv.status = 'paid'
      totalAmount += balance
      await this.repo.save(inv)

      await this.enqueueGlPosting(inv, 'payment_made')
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()
    const invoiceNumbers = invoices.map((i: APInvoiceTypeOrmEntity) => i.invoiceNumber).join(', ')
    const entry = new JournalEntry({
      entryNumber,
      date: new Date(dto.paymentDate),
      description: `Bulk payment to ${invoices[0].vendorName} (${invoices.length} invoices)`,
      reference: dto.reference ?? `Supplier Invoice ${invoiceNumbers}`,
      status: 'approved',
      createdBy: null as any,
      approvedBy: null as any,
      approvedAt: new Date(),
      sourceType: 'supplier_invoice',
      sourceId: invoices[0].id,
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    const apAccount = await this.accountRepo.findByCode('2100')
    const apAccountId = apAccount?.id ?? dto.bankAccountId

    await this.journalLineRepo.save(
      new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: apAccountId,
        debit: new Decimal(totalAmount),
        credit: new Decimal(0),
        description: `AP cleared for ${invoices[0].vendorName}`,
      }),
    )

    await this.journalLineRepo.save(
      new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: dto.bankAccountId,
        debit: new Decimal(0),
        credit: new Decimal(totalAmount),
        description: `Payment to ${invoices[0].vendorName}`,
      }),
    )

    for (const inv of invoices) {
      await this.dataSource.query(
        `UPDATE "ap_invoices" SET "journal_entry_id" = $1 WHERE "id" = $2`,
        [savedEntry.id, inv.id],
      )
    }

    return { paid: invoices.length, totalAmount }
  }

  async enqueueGlPosting(
    inv: APInvoiceTypeOrmEntity,
    eventType: 'invoice_recorded' | 'payment_made',
  ): Promise<void> {
    const amount = Number(inv.amount)

    let suggestedLines: Record<string, unknown>[]
    if (eventType === 'payment_made') {
      suggestedLines = [
        { accountId: '', accountCode: '2100', accountName: 'Accounts Payable', debit: amount, credit: 0, description: `Payment to ${inv.vendorName}` },
        { accountId: '', accountCode: '1100', accountName: 'Bank / Cash', debit: 0, credit: amount, description: `Pay ${inv.invoiceNumber}` },
      ]
    } else {
      suggestedLines = [
        { accountId: '', accountCode: '5100', accountName: 'Expense / Inventory', debit: amount, credit: 0, description: `Purchase - ${inv.invoiceNumber}` },
        { accountId: '', accountCode: '2100', accountName: 'Accounts Payable', debit: 0, credit: amount, description: `Liability - ${inv.invoiceNumber}` },
      ]
    }

    const existing = await this.queueRepo.findOne({
      where: { sourceType: 'supplier_invoice', sourceId: inv.id, eventType },
    })
    if (existing) return

    await this.queueRepo.save(
      this.queueRepo.create({
        sourceType: 'supplier_invoice',
        sourceId: inv.id,
        sourceNumber: inv.invoiceNumber,
        eventType,
        amount,
        description: `${inv.invoiceNumber} - ${inv.vendorName}`,
        suggestedLines,
        status: 'pending',
      }),
    )
  }

  private async toResponse(entity: APInvoiceTypeOrmEntity): Promise<APInvoiceResponse> {
    let glPostingQueueId: string | null = null
    let glPostingQueueStatus: string | null = null
    let journalEntryId: string | null = (entity as any).journalEntryId ?? null
    let journalEntryNumber: string | null = null
    let journalEntryStatus: string | null = null

    try {
      const pq = await this.queueRepo.findOne({
        where: { sourceType: 'supplier_invoice', sourceId: entity.id, status: 'pending' },
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
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      vendorId: entity.vendorId,
      vendorName: entity.vendorName,
      supplierId: entity.supplierId ?? undefined,
      supplierInvoiceNumber: entity.supplierInvoiceNumber ?? undefined,
      poReferenceId: entity.poReferenceId ?? undefined,
      grnReferenceId: entity.grnReferenceId ?? undefined,
      amount: Number(entity.amount),
      paidAmount: Number(entity.paidAmount),
      balance: Number(entity.amount) - Number(entity.paidAmount),
      additionalDiscount: Number(entity.additionalDiscount ?? 0),
      invoiceDate: entity.invoiceDate?.toISOString?.() ?? String(entity.invoiceDate),
      dueDate: entity.dueDate?.toISOString?.() ?? String(entity.dueDate),
      status: entity.status,
      threeWayMatchStatus: entity.threeWayMatchStatus,
      scheduledPaymentDate: entity.scheduledPaymentDate?.toISOString?.() ?? undefined,
      bankAccountId: entity.bankAccountId ?? undefined,
      paymentTermDays: entity.paymentTermDays ?? undefined,
      paymentTermLabel: entity.paymentTermLabel ?? undefined,
      glPostingQueueId,
      glPostingQueueStatus,
      journalEntryId,
      journalEntryNumber,
      journalEntryStatus,
    }
  }
}