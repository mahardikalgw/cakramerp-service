import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  AP_INVOICE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  APInvoiceRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { APInvoiceTypeOrmEntity } from '../../infrastructure/entities/ap-invoice-typeorm.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'

export interface CreateAPInvoiceDto {
  vendorId: string
  vendorName: string
  supplierInvoiceNumber?: string
  poReferenceId?: string
  grnReferenceId?: string
  invoiceDate: string
  dueDate: string
  amount: number
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
  supplierInvoiceNumber?: string
  poReferenceId?: string
  grnReferenceId?: string
  amount: number
  paidAmount: number
  balance: number
  invoiceDate: string
  dueDate: string
  status: string
  threeWayMatchStatus: string
  scheduledPaymentDate?: string
  bankAccountId?: string
}

@Injectable()
export class APInvoiceService {
  constructor(
    @Inject(AP_INVOICE_REPOSITORY)
    private readonly repo: APInvoiceRepositoryPort,
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {}

  async findAll(filters?: {
    vendorId?: string
    status?: string
    dueDateFrom?: string
    dueDateTo?: string
    page?: number
    limit?: number
  }): Promise<{ data: APInvoiceResponse[]; total: number }> {
    const { data: entities, total } = await this.repo.findAll(filters)
    return { data: entities.map(this.toResponse), total }
  }

  async findById(id: string): Promise<APInvoiceResponse | null> {
    const entity = await this.repo.findById(id)
    return entity ? this.toResponse(entity) : null
  }

  async create(dto: CreateAPInvoiceDto): Promise<APInvoiceResponse> {
    const invoiceNumber = await this.repo.getNextInvoiceNumber()

    // Determine 3-way match status
    let threeWayMatchStatus = 'pending'
    if (dto.poReferenceId && dto.grnReferenceId) {
      threeWayMatchStatus = 'matched'
    } else if (dto.poReferenceId || dto.grnReferenceId) {
      threeWayMatchStatus = 'partial'
    }

    const entity = await this.repo.save(
      this.repo.create({
        invoiceNumber,
        vendorId: dto.vendorId,
        vendorName: dto.vendorName,
        supplierInvoiceNumber: dto.supplierInvoiceNumber,
        poReferenceId: dto.poReferenceId,
        grnReferenceId: dto.grnReferenceId,
        amount: dto.amount,
        paidAmount: 0,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        status: 'pending',
        threeWayMatchStatus,
      }),
    )

    return this.toResponse(entity)
  }

  async schedulePayment(id: string, dto: SchedulePaymentDto): Promise<APInvoiceResponse> {
    const entity = await this.repo.findById(id)
    if (!entity) throw new BadRequestException('AP Invoice not found')

    entity.scheduledPaymentDate = new Date(dto.dueDate)
    entity.bankAccountId = dto.bankAccountId
    const saved = await this.repo.save(entity)
    return this.toResponse(saved)
  }

  async bulkPayment(dto: BulkPaymentDto): Promise<{ paid: number; totalAmount: number }> {
    const invoices = await this.repo.findByIds(dto.invoiceIds)

    if (invoices.length === 0) {
      throw new BadRequestException('No invoices found')
    }

    // Validate all from same vendor
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
    }

    // Create GL entry: Debit AP, Credit Cash/Bank
    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()
    const entry = new JournalEntry({
      entryNumber,
      date: new Date(dto.paymentDate),
      description: `Bulk payment to ${invoices[0].vendorName} (${invoices.length} invoices)`,
      reference: dto.reference ?? `BULK-${entryNumber}`,
      status: 'approved',
      createdBy: 'system',
      approvedBy: 'system',
      approvedAt: new Date(),
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    // Debit: AP account
    await this.journalLineRepo.save(
      new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: dto.bankAccountId, // TODO: Use AP account
        debit: new Decimal(totalAmount),
        credit: new Decimal(0),
        description: `AP cleared for ${invoices[0].vendorName}`,
      }),
    )

    // Credit: Cash/Bank
    await this.journalLineRepo.save(
      new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: dto.bankAccountId,
        debit: new Decimal(0),
        credit: new Decimal(totalAmount),
        description: `Payment to ${invoices[0].vendorName}`,
      }),
    )

    return { paid: invoices.length, totalAmount }
  }

  private toResponse(entity: APInvoiceTypeOrmEntity): APInvoiceResponse {
    return {
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      vendorId: entity.vendorId,
      vendorName: entity.vendorName,
      supplierInvoiceNumber: entity.supplierInvoiceNumber ?? undefined,
      poReferenceId: entity.poReferenceId ?? undefined,
      grnReferenceId: entity.grnReferenceId ?? undefined,
      amount: Number(entity.amount),
      paidAmount: Number(entity.paidAmount),
      balance: Number(entity.amount) - Number(entity.paidAmount),
      invoiceDate: entity.invoiceDate?.toISOString?.() ?? String(entity.invoiceDate),
      dueDate: entity.dueDate?.toISOString?.() ?? String(entity.dueDate),
      status: entity.status,
      threeWayMatchStatus: entity.threeWayMatchStatus,
      scheduledPaymentDate: entity.scheduledPaymentDate?.toISOString?.() ?? undefined,
      bankAccountId: entity.bankAccountId ?? undefined,
    }
  }
}
