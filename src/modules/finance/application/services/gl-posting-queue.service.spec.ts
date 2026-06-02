import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { GlPostingQueueService } from './gl-posting-queue.service';
import {
  GL_POSTING_QUEUE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import { PostGlToJournalCommand } from '../commands/post-gl-to-journal.command';

describe('GlPostingQueueService', () => {
  let service: GlPostingQueueService;

  const mockRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJournalEntryRepo = {
    save: jest.fn(),
    getNextEntryNumber: jest.fn(),
  };

  const mockJournalLineRepo = {
    save: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlPostingQueueService,
        { provide: GL_POSTING_QUEUE_REPOSITORY, useValue: mockRepo },
        { provide: JOURNAL_ENTRY_REPOSITORY, useValue: mockJournalEntryRepo },
        {
          provide: JOURNAL_ENTRY_LINE_REPOSITORY,
          useValue: mockJournalLineRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(GlPostingQueueService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return queue items with resolved names', async () => {
      const items = [
        {
          id: '1',
          sourceType: 'sales_invoice',
          sourceId: 'inv1',
          sourceNumber: 'INV-001',
          eventType: 'invoice_issued',
          amount: 1000,
          description: 'Test',
          suggestedLines: [],
          status: 'pending',
          journalEntryId: null,
          postedBy: null,
          postedAt: null,
          createdAt: new Date(),
          customerId: null,
          supplierId: null,
          invoiceId: null,
          billingLetterId: null,
        },
      ];
      mockRepo.findAll.mockResolvedValue({ data: items, total: 1 });
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.findAll({
        status: 'pending',
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });
  });

  describe('findById', () => {
    it('should return queue item by id', async () => {
      const item = {
        id: '1',
        sourceType: 'sales_invoice',
        sourceId: 'inv1',
        sourceNumber: 'INV-001',
        eventType: 'invoice_issued',
        amount: 1000,
        description: 'Test',
        suggestedLines: [],
        status: 'pending',
        journalEntryId: null,
        postedBy: null,
        postedAt: null,
        createdAt: new Date(),
      };
      mockRepo.findById.mockResolvedValue(item);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.findById('1');

      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
    });

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('createEntry', () => {
    it('should create a queue entry', async () => {
      const input = {
        sourceType: 'sales_invoice',
        sourceId: 'inv1',
        sourceNumber: 'INV-001',
        eventType: 'invoice_issued',
        amount: 1000,
        description: 'Sales invoice issued',
        suggestedLines: [
          { accountId: 'a1', debit: 1000, credit: 0 },
          { accountId: 'a2', debit: 0, credit: 1000 },
        ],
      };
      mockRepo.save.mockImplementation(async (entity) => ({
        id: 'q1',
        ...entity,
      }));

      const result = await service.createEntry(input);

      expect(result.sourceType).toBe('sales_invoice');
      expect(result.status).toBe('pending');
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending queue item', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'pending' });
      mockRepo.update.mockResolvedValue(undefined);

      await service.cancel('1');

      expect(mockRepo.update).toHaveBeenCalledWith('1', {
        status: 'cancelled',
      });
    });

    it('should throw if queue item not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('999')).rejects.toThrow(BadRequestException);
      await expect(service.cancel('999')).rejects.toThrow(
        'Queue item not found',
      );
    });

    it('should throw if queue item is not pending', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'posted' });

      await expect(service.cancel('1')).rejects.toThrow(BadRequestException);
      await expect(service.cancel('1')).rejects.toThrow(
        'Only pending items can be cancelled',
      );
    });
  });

  describe('postToJournal', () => {
    it('should post a sales invoice queue item to journal', async () => {
      const queueItem = {
        id: '1',
        sourceType: 'sales_invoice',
        sourceId: 'inv1',
        sourceNumber: 'INV-001',
        eventType: 'invoice_issued',
        amount: 1000,
        status: 'pending',
      };
      mockRepo.findById.mockResolvedValue(queueItem);
      mockJournalEntryRepo.getNextEntryNumber.mockResolvedValue('JE-001');
      mockJournalEntryRepo.save.mockImplementation(async (e) => ({
        ...e,
        id: 'je1',
      }));
      mockJournalLineRepo.save.mockImplementation(async (l) => l);
      mockRepo.update.mockResolvedValue(undefined);
      mockDataSource.query.mockResolvedValue(undefined);

      const command = new PostGlToJournalCommand('2024-01-15', 'Post invoice', [
        { accountId: 'a1', debit: 1000, credit: 0, description: 'AR' },
        { accountId: 'a2', debit: 0, credit: 1000, description: 'Revenue' },
      ]);

      const result = await service.postToJournal('1', command, 'user1');

      expect(result.journalEntryId).toBe('je1');
      expect(result.journalEntryNumber).toBe('JE-001');
      expect(mockRepo.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ status: 'posted' }),
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ar_invoices'),
        expect.arrayContaining(['je1', 'inv1']),
      );
    });

    it('should post a supplier invoice queue item to journal', async () => {
      const queueItem = {
        id: '2',
        sourceType: 'supplier_invoice',
        sourceId: 'inv2',
        sourceNumber: 'SINV-001',
        status: 'pending',
      };
      mockRepo.findById.mockResolvedValue(queueItem);
      mockJournalEntryRepo.getNextEntryNumber.mockResolvedValue('JE-002');
      mockJournalEntryRepo.save.mockImplementation(async (e) => ({
        ...e,
        id: 'je2',
      }));
      mockJournalLineRepo.save.mockImplementation(async (l) => l);
      mockRepo.update.mockResolvedValue(undefined);
      mockDataSource.query.mockResolvedValue(undefined);

      const command = new PostGlToJournalCommand(
        '2024-01-15',
        'Post supplier invoice',
        [
          { accountId: 'a1', debit: 500, credit: 0 },
          { accountId: 'a2', debit: 0, credit: 500 },
        ],
      );

      await service.postToJournal('2', command, 'user1');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ap_invoices'),
        expect.arrayContaining(['je2', 'inv2']),
      );
    });

    it('should throw if queue item not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.postToJournal(
          '999',
          new PostGlToJournalCommand('2024-01-15', 'test', []),
          'user1',
        ),
      ).rejects.toThrow('Queue item not found');
    });

    it('should throw if queue item is not pending', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'posted' });

      await expect(
        service.postToJournal(
          '1',
          new PostGlToJournalCommand('2024-01-15', 'test', []),
          'user1',
        ),
      ).rejects.toThrow('Only pending items can be posted');
    });
  });
});
