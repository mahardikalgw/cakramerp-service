import { BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { GlPostingQueueService } from './gl-posting-queue.service';

/**
 * Unit tests for the GL posting queue service. The service is the single
 * point that turns a domain event (PO approved, return approved, etc.)
 * into a GL journal entry. The state machine on the queue is small but
 * high-impact: once an entry is `posted` the downstream journal is
 * immutable.
 */

function makeService(opts: { item?: any; nextEntryNumber?: string }) {
  const item = opts.item ?? null;
  const nextEntryNumber = opts.nextEntryNumber ?? 'JE-2026-0001';

  const queueRepo: any = {
    save: jest.fn().mockImplementation(async (e: any) => ({
      id: 'glq-1',
      createdAt: new Date(),
      ...e,
    })),
    findById: jest
      .fn()
      .mockImplementation(async (id: string) =>
        item && item.id === id ? item : null,
      ),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const journalEntryRepo: any = {
    getNextEntryNumber: jest.fn().mockResolvedValue(nextEntryNumber),
    save: jest.fn().mockImplementation(async (e: any) => ({
      id: 'je-1',
      ...e,
    })),
  };
  const journalLineRepo: any = {
    save: jest
      .fn()
      .mockImplementation(async (e: any) => ({ id: 'line-1', ...e })),
  };
  const dataSource: any = {
    query: jest.fn().mockImplementation(async () => {
      // update ar_invoices.journal_entry_id
      // update ap_invoices.journal_entry_id
      return [];
    }),
  };

  const svc = new GlPostingQueueService(
    queueRepo,
    journalEntryRepo,
    journalLineRepo,
    dataSource,
  );
  return { svc, queueRepo, journalEntryRepo, journalLineRepo, dataSource };
}

describe('GlPostingQueueService', () => {
  describe('createEntry', () => {
    it('persists the entry with a pending status and the suggested lines', async () => {
      const { svc, queueRepo } = makeService({});
      const result = await svc.createEntry({
        sourceType: 'purchase_order',
        sourceId: 'po-1',
        sourceNumber: 'PO-2026-0001',
        eventType: 'po_approved',
        amount: 1000,
        description: 'PO commitment',
        suggestedLines: [
          {
            accountId: '',
            accountCode: '1399',
            accountName: 'Commitment',
            debit: 1000,
            credit: 0,
          },
          {
            accountId: '',
            accountCode: '2100',
            accountName: 'AP commitment',
            debit: 0,
            credit: 1000,
          },
        ],
      });

      expect(queueRepo.save).toHaveBeenCalledTimes(1);
      const saved = queueRepo.save.mock.calls[0][0];
      expect(saved.status).toBe('pending');
      expect(saved.suggestedLines).toHaveLength(2);
      // The result is the saved entity, not just an id.
      expect(result).toBeDefined();
    });
  });

  describe('postToJournal', () => {
    it('throws BadRequestException when the queue item is missing', async () => {
      const { svc } = makeService({ item: null });
      await expect(
        svc.postToJournal(
          'missing',
          {
            date: '2026-06-03',
            description: 'Test',
            lines: [],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when the entry is already posted', async () => {
      const { svc } = makeService({
        item: {
          id: 'glq-1',
          status: 'posted',
          sourceType: 'purchase_order',
          sourceId: 'po-1',
          sourceNumber: 'PO-2026-0001',
          eventType: 'po_approved',
          amount: 1000,
          description: 'PO commitment',
          suggestedLines: [],
        },
      });
      await expect(
        svc.postToJournal(
          'glq-1',
          {
            date: '2026-06-03',
            description: 'Test',
            lines: [{ accountId: 'a', debit: 1, credit: 0, description: '' }],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists the journal entry, lines, and marks the queue item posted', async () => {
      const { svc, queueRepo, journalEntryRepo, journalLineRepo } = makeService(
        {
          item: {
            id: 'glq-1',
            status: 'pending',
            sourceType: 'purchase_order',
            sourceId: 'po-1',
            sourceNumber: 'PO-2026-0001',
            eventType: 'po_approved',
            amount: 1000,
            description: 'PO commitment',
            suggestedLines: [],
          },
          nextEntryNumber: 'JE-2026-0001',
        },
      );

      const result = await svc.postToJournal(
        'glq-1',
        {
          date: '2026-06-03',
          description: 'Test',
          lines: [
            { accountId: 'a1', debit: 1000, credit: 0, description: 'Dr' },
            { accountId: 'a2', debit: 0, credit: 1000, description: 'Cr' },
          ],
        },
        'user-1',
      );

      expect(journalEntryRepo.getNextEntryNumber).toHaveBeenCalled();
      expect(journalEntryRepo.save).toHaveBeenCalledTimes(1);
      expect(journalLineRepo.save).toHaveBeenCalledTimes(2);
      expect(queueRepo.update).toHaveBeenCalledWith(
        'glq-1',
        expect.objectContaining({ status: 'posted' }),
      );
      // postToJournal returns a structural object the controller uses.
      expect(result).toBeDefined();
      expect(result.journalEntryNumber).toBe('JE-2026-0001');
    });
  });

  describe('cancel', () => {
    it('cancels a pending entry', async () => {
      const { svc, queueRepo } = makeService({
        item: {
          id: 'glq-1',
          status: 'pending',
          sourceType: 'purchase_order',
          sourceId: 'po-1',
          sourceNumber: 'PO-2026-0001',
          eventType: 'po_approved',
          amount: 1000,
          description: 'PO',
          suggestedLines: [],
        },
      });
      await svc.cancel('glq-1');
      expect(queueRepo.update).toHaveBeenCalledWith('glq-1', {
        status: 'cancelled',
      });
    });

    it('refuses to cancel a posted entry', async () => {
      const { svc } = makeService({
        item: {
          id: 'glq-1',
          status: 'posted',
          sourceType: 'purchase_order',
          sourceId: 'po-1',
          sourceNumber: 'PO-2026-0001',
          eventType: 'po_approved',
          amount: 1000,
          description: 'PO',
          suggestedLines: [],
        },
      });
      await expect(svc.cancel('glq-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

// Decimal import is used by the service; include here so this test file
// is self-contained when run in isolation.
void Decimal;
