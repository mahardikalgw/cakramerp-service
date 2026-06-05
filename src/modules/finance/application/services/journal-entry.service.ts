import { JournalEntryServicePort } from '../ports/journal-entry-service.port';
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import {
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import type {
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
  AccountRepositoryPort,
} from '../../domain/repositories/finance-repository.port';
import { SUBSIDIARY_LEDGER_SERVICE } from '../ports/subsidiary-ledger-service.port';
import type { SubsidiaryLedgerServicePort } from '../ports/subsidiary-ledger-service.port';
import { BillingLetterService } from './billing-letter.service';
import { JournalEntry } from '../../domain/entities/journal-entry.entity';
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity';
import { CreateJournalEntryCommand } from '../commands/create-journal-entry.command';

export interface JournalEntryWithLines {
  entry: JournalEntry;
  lines: any[];
  totalDebit: number;
  totalCredit: number;
}

@Injectable()
export class JournalEntryService implements JournalEntryServicePort {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    @Inject(SUBSIDIARY_LEDGER_SERVICE)
    private readonly subsidiaryLedgerService: SubsidiaryLedgerServicePort,
    private readonly billingLetterService: BillingLetterService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: JournalEntryWithLines[]; total: number }> {
    const { data: entries, total } = await this.journalEntryRepo.findAll({
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
      status: filters?.status,
      page: filters?.page,
      limit: filters?.limit,
    });

    const result: JournalEntryWithLines[] = [];
    for (const entry of entries) {
      const lines = await this.journalLineRepo.findByJournalEntryId(entry.id);
      const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce(
        (sum, l) => sum + l.credit.toNumber(),
        0,
      );
      result.push({ entry, lines, totalDebit, totalCredit });
    }

    return { data: result, total };
  }

  async findById(id: string): Promise<JournalEntryWithLines | null> {
    const entry = await this.journalEntryRepo.findById(id);
    if (!entry) return null;

    const lines = await this.journalLineRepo.findByJournalEntryId(id);
    const enrichedLines = await this.enrichLinesWithAccounts(lines);
    const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit.toNumber(), 0);

    return { entry, lines: enrichedLines, totalDebit, totalCredit };
  }

  async create(
    command: CreateJournalEntryCommand,
    userId: string,
    asDraft = true,
  ): Promise<JournalEntryWithLines> {
    const totalDebit = command.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = command.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    if (command.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber();

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(command.date),
      description: command.description,
      reference: command.reference,
      segment: command.segment,
      projectId: command.projectId,
      costCenter: command.costCenter,
      status: asDraft ? 'draft' : 'pending_approval',
      createdBy: userId,
    });

    const savedEntry = await this.journalEntryRepo.save(entry);

    const lines: JournalEntryLine[] = [];
    for (const line of command.lines) {
      const jeLine = new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: line.accountId,
        debit: new Decimal(line.debit),
        credit: new Decimal(line.credit),
        description: line.description,
      });
      const savedLine = await this.journalLineRepo.save(jeLine);
      lines.push(savedLine);
    }

    return { entry: savedEntry, lines, totalDebit, totalCredit };
  }

  async submit(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepo.findById(id);
    if (!entry) throw new BadRequestException('Journal entry not found');
    if (entry.status !== 'draft') {
      throw new BadRequestException(
        'Only draft entries can be submitted for approval',
      );
    }

    entry.status = 'pending_approval';
    entry.updatedAt = new Date();
    entry.approvedBy = userId;
    return this.journalEntryRepo.save(entry);
  }

  async approve(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepo.findById(id);
    if (!entry) throw new BadRequestException('Journal entry not found');
    if (entry.status !== 'pending_approval') {
      throw new BadRequestException('Only pending entries can be approved');
    }

    entry.status = 'approved';
    entry.approvedBy = userId;
    entry.approvedAt = new Date();
    entry.updatedAt = new Date();
    const savedEntry = await this.journalEntryRepo.save(entry);

    // Auto-record in subsidiary ledger on approval
    await this.recordSubsidiaryLedger(savedEntry);

    return savedEntry;
  }

  private async recordSubsidiaryLedger(entry: JournalEntry): Promise<void> {
    // Read journal_type, customer_id, supplier_id, party_name from DB
    const rows = await this.dataSource.query(
      `SELECT journal_type, customer_id, supplier_id, party_name, invoice_id, billing_letter_id, subsidiary_ledger_recorded FROM journal_entries WHERE id = $1`,
      [entry.id],
    );
    if (!rows.length) return;

    const {
      journal_type,
      customer_id,
      supplier_id,
      party_name,
      invoice_id,
      billing_letter_id,
      subsidiary_ledger_recorded,
    } = rows[0];
    if (subsidiary_ledger_recorded) return; // already recorded

    const lines = await this.journalLineRepo.findByJournalEntryId(entry.id);
    const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0);

    if (journal_type === 'payment_payable' && supplier_id) {
      // For billing letter payments, applyPayment will record per-invoice ledger entries
      if (billing_letter_id) {
        await this.billingLetterService.applyPayment(
          billing_letter_id,
          entry.id,
        );
      } else {
        // Direct payment (not via billing letter) → single combined entry
        await this.subsidiaryLedgerService.recordApEntry({
          supplierId: supplier_id,
          supplierName: party_name || '',
          journalEntryId: entry.id,
          invoiceId: invoice_id || undefined,
          invoiceNumber: entry.reference || '',
          date:
            entry.date instanceof Date
              ? entry.date.toISOString().split('T')[0]
              : String(entry.date),
          description: entry.description || '',
          debit: totalDebit,
          credit: 0,
        });
      }
      await this.dataSource.query(
        `UPDATE journal_entries SET subsidiary_ledger_recorded = true WHERE id = $1`,
        [entry.id],
      );
    } else if (journal_type === 'payment_receivable' && customer_id) {
      // For billing letter payments, applyPayment will record per-invoice ledger entries
      if (billing_letter_id) {
        await this.billingLetterService.applyPayment(
          billing_letter_id,
          entry.id,
        );
      } else {
        // Direct payment (not via billing letter) → single combined entry
        await this.subsidiaryLedgerService.recordArEntry({
          customerId: customer_id,
          customerName: party_name || '',
          journalEntryId: entry.id,
          invoiceId: invoice_id || undefined,
          invoiceNumber: entry.reference || '',
          date:
            entry.date instanceof Date
              ? entry.date.toISOString().split('T')[0]
              : String(entry.date),
          description: entry.description || '',
          debit: 0,
          credit: totalDebit,
        });
      }
      await this.dataSource.query(
        `UPDATE journal_entries SET subsidiary_ledger_recorded = true WHERE id = $1`,
        [entry.id],
      );
    } else if (journal_type === 'invoice_payable' && supplier_id) {
      // Supplier invoice recorded → CREDIT in AP Subsidiary Ledger (utang bertambah)
      await this.subsidiaryLedgerService.recordApEntry({
        supplierId: supplier_id,
        supplierName: party_name || '',
        journalEntryId: entry.id,
        invoiceId: invoice_id || undefined,
        invoiceNumber: entry.reference || '',
        date:
          entry.date instanceof Date
            ? entry.date.toISOString().split('T')[0]
            : String(entry.date),
        description: entry.description || '',
        debit: 0,
        credit: totalDebit,
      });
      await this.dataSource.query(
        `UPDATE journal_entries SET subsidiary_ledger_recorded = true WHERE id = $1`,
        [entry.id],
      );
    } else if (journal_type === 'invoice_receivable' && customer_id) {
      // Customer invoice issued → DEBIT in AR Subsidiary Ledger (piutang bertambah)
      await this.subsidiaryLedgerService.recordArEntry({
        customerId: customer_id,
        customerName: party_name || '',
        journalEntryId: entry.id,
        invoiceId: invoice_id || undefined,
        invoiceNumber: entry.reference || '',
        date:
          entry.date instanceof Date
            ? entry.date.toISOString().split('T')[0]
            : String(entry.date),
        description: entry.description || '',
        debit: totalDebit,
        credit: 0,
      });
      await this.dataSource.query(
        `UPDATE journal_entries SET subsidiary_ledger_recorded = true WHERE id = $1`,
        [entry.id],
      );
    }
  }

  async reverse(id: string, userId: string): Promise<JournalEntryWithLines> {
    const original = await this.findById(id);
    if (!original) throw new BadRequestException('Journal entry not found');
    if (original.entry.status !== 'approved') {
      throw new BadRequestException('Only approved entries can be reversed');
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber();

    const reversalEntry = new JournalEntry({
      entryNumber,
      date: new Date(),
      description: `Reversal of ${original.entry.entryNumber}: ${original.entry.description}`,
      reference: original.entry.reference,
      segment: original.entry.segment,
      projectId: original.entry.projectId,
      costCenter: original.entry.costCenter,
      status: 'approved',
      createdBy: userId,
      approvedBy: userId,
      approvedAt: new Date(),
      reversalOfId: id,
    });

    const savedReversal = await this.journalEntryRepo.save(reversalEntry);

    const lines: JournalEntryLine[] = [];
    for (const line of original.lines) {
      const reversalLine = new JournalEntryLine({
        journalEntryId: savedReversal.id,
        accountId: line.accountId,
        debit: new Decimal(line.credit),
        credit: new Decimal(line.debit),
        description: `Reversal: ${line.description ?? ''}`,
      });
      const savedLine = await this.journalLineRepo.save(reversalLine);
      lines.push(savedLine);
    }

    original.entry.status = 'reversed';
    original.entry.updatedAt = new Date();
    await this.journalEntryRepo.save(original.entry);

    const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit.toNumber(), 0);

    return { entry: savedReversal, lines, totalDebit, totalCredit };
  }

  private async enrichLinesWithAccounts(
    lines: JournalEntryLine[],
  ): Promise<any[]> {
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accountMap = new Map<string, { code: string; name: string }>();

    for (const accountId of accountIds) {
      const account = await this.accountRepo.findById(accountId);
      if (account) {
        accountMap.set(accountId, { code: account.code, name: account.name });
      }
    }

    return lines.map((line) => {
      const account = accountMap.get(line.accountId);
      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        accountId: line.accountId,
        accountCode: account?.code ?? '',
        accountName: account?.name ?? '',
        debit: line.debit.toNumber(),
        credit: line.credit.toNumber(),
        description: line.description ?? '',
        createdAt: line.createdAt,
      };
    });
  }
}
