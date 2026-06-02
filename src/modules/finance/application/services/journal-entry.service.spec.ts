import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { JournalEntryService } from './journal-entry.service';
import {
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import { SUBSIDIARY_LEDGER_SERVICE } from '../ports/subsidiary-ledger-service.port';
import { BillingLetterService } from './billing-letter.service';
import { CreateJournalEntryCommand } from '../commands/create-journal-entry.command';

describe('JournalEntryService', () => {
  let service: JournalEntryService;

  const mockJournalEntryRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    getNextEntryNumber: jest.fn(),
  };

  const mockJournalLineRepo = {
    findByJournalEntryId: jest.fn(),
    save: jest.fn(),
  };

  const mockAccountRepo = {
    findById: jest.fn(),
  };

  const mockSubsidiaryLedgerService = {
    recordArEntry: jest.fn(),
    recordApEntry: jest.fn(),
  };

  const mockBillingLetterService = {
    applyPayment: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntryService,
        { provide: JOURNAL_ENTRY_REPOSITORY, useValue: mockJournalEntryRepo },
        {
          provide: JOURNAL_ENTRY_LINE_REPOSITORY,
          useValue: mockJournalLineRepo,
        },
        { provide: ACCOUNT_REPOSITORY, useValue: mockAccountRepo },
        {
          provide: SUBSIDIARY_LEDGER_SERVICE,
          useValue: mockSubsidiaryLedgerService,
        },
        { provide: BillingLetterService, useValue: mockBillingLetterService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(JournalEntryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return journal entries with lines and totals', async () => {
      const entries = [
        {
          id: '1',
          entryNumber: 'JE-001',
          date: new Date(),
          description: 'Test',
          status: 'draft',
        },
      ];
      const lines = [
        {
          id: 'l1',
          journalEntryId: '1',
          accountId: 'a1',
          debit: new Decimal(100),
          credit: new Decimal(0),
        },
        {
          id: 'l2',
          journalEntryId: '1',
          accountId: 'a2',
          debit: new Decimal(0),
          credit: new Decimal(100),
        },
      ];
      mockJournalEntryRepo.findAll.mockResolvedValue({
        data: entries,
        total: 1,
      });
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue(lines);

      const result = await service.findAll({
        status: 'draft',
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].totalDebit).toBe(100);
      expect(result.data[0].totalCredit).toBe(100);
    });

    it('should return empty result when no entries exist', async () => {
      mockJournalEntryRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findAll();

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return entry with enriched lines', async () => {
      const entry = {
        id: '1',
        entryNumber: 'JE-001',
        date: new Date(),
        description: 'Test',
        status: 'draft',
      };
      const lines = [
        {
          id: 'l1',
          journalEntryId: '1',
          accountId: 'a1',
          debit: new Decimal(100),
          credit: new Decimal(0),
          description: 'desc',
        },
        {
          id: 'l2',
          journalEntryId: '1',
          accountId: 'a2',
          debit: new Decimal(0),
          credit: new Decimal(100),
          description: 'desc',
        },
      ];
      mockJournalEntryRepo.findById.mockResolvedValue(entry);
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue(lines);
      mockAccountRepo.findById
        .mockResolvedValueOnce({ id: 'a1', code: '1000', name: 'Cash' })
        .mockResolvedValueOnce({ id: 'a2', code: '2000', name: 'Revenue' });

      const result = await service.findById('1');

      expect(result).not.toBeNull();
      expect(result.entry.id).toBe('1');
      expect(result.totalDebit).toBe(100);
      expect(result.totalCredit).toBe(100);
      expect(result.lines[0].accountCode).toBe('1000');
    });

    it('should return null when entry not found', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a balanced journal entry', async () => {
      const command = new CreateJournalEntryCommand(
        '2024-01-01',
        'Test entry',
        [
          { accountId: 'a1', debit: 100, credit: 0 },
          { accountId: 'a2', debit: 0, credit: 100 },
        ],
      );
      mockJournalEntryRepo.getNextEntryNumber.mockResolvedValue('JE-001');
      mockJournalEntryRepo.save.mockImplementation(async (e) => ({
        id: '1',
        ...e,
      }));
      mockJournalLineRepo.save.mockImplementation(async (l) => ({
        id: `line-${Math.random()}`,
        ...l,
      }));

      const result = await service.create(command, 'user1');

      expect(result.entry.status).toBe('draft');
      expect(result.totalDebit).toBe(100);
      expect(result.totalCredit).toBe(100);
      expect(mockJournalLineRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should create entry with pending_approval status when asDraft is false', async () => {
      const command = new CreateJournalEntryCommand(
        '2024-01-01',
        'Test entry',
        [
          { accountId: 'a1', debit: 50, credit: 0 },
          { accountId: 'a2', debit: 0, credit: 50 },
        ],
      );
      mockJournalEntryRepo.getNextEntryNumber.mockResolvedValue('JE-002');
      mockJournalEntryRepo.save.mockImplementation(async (e) => ({
        id: '2',
        ...e,
      }));
      mockJournalLineRepo.save.mockImplementation(async (l) => ({
        id: `line-${Math.random()}`,
        ...l,
      }));

      const result = await service.create(command, 'user1', false);

      expect(result.entry.status).toBe('pending_approval');
    });

    it('should throw if journal entry is unbalanced', async () => {
      const command = new CreateJournalEntryCommand(
        '2024-01-01',
        'Unbalanced',
        [
          { accountId: 'a1', debit: 100, credit: 0 },
          { accountId: 'a2', debit: 0, credit: 50 },
        ],
      );

      await expect(service.create(command, 'user1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(command, 'user1')).rejects.toThrow(
        'Journal entry is unbalanced',
      );
    });

    it('should throw if fewer than 2 lines', async () => {
      const command = new CreateJournalEntryCommand('2024-01-01', 'One line', [
        { accountId: 'a1', debit: 100, credit: 100 },
      ]);

      await expect(service.create(command, 'user1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(command, 'user1')).rejects.toThrow(
        'Journal entry must have at least 2 lines',
      );
    });
  });

  describe('submit', () => {
    it('should submit a draft entry', async () => {
      const entry = { id: '1', status: 'draft', updatedAt: new Date() };
      mockJournalEntryRepo.findById.mockResolvedValue(entry);
      mockJournalEntryRepo.save.mockImplementation(async (e) => e);

      const result = await service.submit('1', 'user1');

      expect(result.status).toBe('pending_approval');
    });

    it('should throw if entry not found', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue(null);

      await expect(service.submit('999', 'user1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submit('999', 'user1')).rejects.toThrow(
        'Journal entry not found',
      );
    });

    it('should throw if entry is not draft', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue({
        id: '1',
        status: 'approved',
      });

      await expect(service.submit('1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submit('1', 'user1')).rejects.toThrow(
        'Only draft entries can be submitted for approval',
      );
    });
  });

  describe('approve', () => {
    it('should approve a pending entry and record subsidiary ledger for AR invoice', async () => {
      const entry = {
        id: '1',
        status: 'pending_approval',
        date: new Date('2024-01-01'),
        description: 'test',
        reference: 'INV-001',
      };
      mockJournalEntryRepo.findById.mockResolvedValue(entry);
      mockJournalEntryRepo.save.mockImplementation(async (e) => e);
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            journal_type: 'invoice_receivable',
            customer_id: 'c1',
            supplier_id: null,
            party_name: 'Customer A',
            invoice_id: 'inv1',
            billing_letter_id: null,
            subsidiary_ledger_recorded: false,
          },
        ])
        .mockResolvedValue(undefined);
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue([
        { debit: new Decimal(100), credit: new Decimal(0) },
      ]);

      const result = await service.approve('1', 'user1');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('user1');
      expect(mockSubsidiaryLedgerService.recordArEntry).toHaveBeenCalled();
    });

    it('should approve and record AP invoice', async () => {
      const entry = {
        id: '1',
        status: 'pending_approval',
        date: new Date('2024-01-01'),
        description: 'test',
        reference: 'INV-002',
      };
      mockJournalEntryRepo.findById.mockResolvedValue(entry);
      mockJournalEntryRepo.save.mockImplementation(async (e) => e);
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            journal_type: 'invoice_payable',
            customer_id: null,
            supplier_id: 's1',
            party_name: 'Supplier A',
            invoice_id: 'inv2',
            billing_letter_id: null,
            subsidiary_ledger_recorded: false,
          },
        ])
        .mockResolvedValue(undefined);
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue([
        { debit: new Decimal(0), credit: new Decimal(200) },
      ]);

      const result = await service.approve('1', 'user1');

      expect(result.status).toBe('approved');
      expect(mockSubsidiaryLedgerService.recordApEntry).toHaveBeenCalled();
    });

    it('should skip subsidiary ledger if already recorded', async () => {
      const entry = {
        id: '1',
        status: 'pending_approval',
        date: new Date(),
        description: 'test',
      };
      mockJournalEntryRepo.findById.mockResolvedValue(entry);
      mockJournalEntryRepo.save.mockImplementation(async (e) => e);
      mockDataSource.query.mockResolvedValueOnce([
        {
          journal_type: 'invoice_receivable',
          customer_id: 'c1',
          supplier_id: null,
          party_name: 'Customer A',
          invoice_id: null,
          billing_letter_id: null,
          subsidiary_ledger_recorded: true,
        },
      ]);

      await service.approve('1', 'user1');

      expect(mockSubsidiaryLedgerService.recordArEntry).not.toHaveBeenCalled();
      expect(mockSubsidiaryLedgerService.recordApEntry).not.toHaveBeenCalled();
    });

    it('should throw if entry not found', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue(null);

      await expect(service.approve('999', 'user1')).rejects.toThrow(
        'Journal entry not found',
      );
    });

    it('should throw if entry is not pending_approval', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue({
        id: '1',
        status: 'draft',
      });

      await expect(service.approve('1', 'user1')).rejects.toThrow(
        'Only pending entries can be approved',
      );
    });
  });

  describe('reverse', () => {
    it('should reverse an approved entry with swapped debit/credit', async () => {
      const originalEntry = {
        id: '1',
        entryNumber: 'JE-001',
        status: 'approved',
        description: 'Original',
        reference: 'REF',
        date: new Date(),
      };
      const originalLines = [
        {
          id: 'l1',
          journalEntryId: '1',
          accountId: 'a1',
          debit: new Decimal(100),
          credit: new Decimal(0),
          description: 'line1',
        },
        {
          id: 'l2',
          journalEntryId: '1',
          accountId: 'a2',
          debit: new Decimal(0),
          credit: new Decimal(100),
          description: 'line2',
        },
      ];

      mockJournalEntryRepo.findById.mockResolvedValue(originalEntry);
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue(originalLines);
      mockAccountRepo.findById.mockResolvedValue({
        code: '1000',
        name: 'Cash',
      });
      mockJournalEntryRepo.getNextEntryNumber.mockResolvedValue('JE-002');
      mockJournalEntryRepo.save.mockImplementation(async (e) => ({
        id: `new-${Math.random()}`,
        ...e,
      }));
      mockJournalLineRepo.save.mockImplementation(async (l) => ({
        id: `line-${Math.random()}`,
        ...l,
      }));

      const result = await service.reverse('1', 'user1');

      expect(result.entry.description).toContain('Reversal of JE-001');
      expect(result.entry.status).toBe('approved');
      // The reversal entry lines should have swapped debit/credit
      expect(mockJournalLineRepo.save).toHaveBeenCalledTimes(2);
      // Original entry should be marked as reversed
      expect(originalEntry.status).toBe('reversed');
    });

    it('should throw if entry not found', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue(null);

      await expect(service.reverse('999', 'user1')).rejects.toThrow(
        'Journal entry not found',
      );
    });

    it('should throw if entry is not approved', async () => {
      mockJournalEntryRepo.findById.mockResolvedValue({
        id: '1',
        status: 'draft',
      });
      mockJournalLineRepo.findByJournalEntryId.mockResolvedValue([]);
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(service.reverse('1', 'user1')).rejects.toThrow(
        'Only approved entries can be reversed',
      );
    });
  });
});
