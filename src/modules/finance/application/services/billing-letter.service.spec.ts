import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BillingLetterService } from './billing-letter.service';
import { SUBSIDIARY_LEDGER_SERVICE } from '../ports/subsidiary-ledger-service.port';

describe('BillingLetterService', () => {
  let service: BillingLetterService;

  const mockSubsidiaryLedgerService = {
    recordArEntry: jest.fn(),
    recordApEntry: jest.fn(),
  };

  const queueRepoMock = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
    getRepository: jest.fn().mockReturnValue(queueRepoMock),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingLetterService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: SUBSIDIARY_LEDGER_SERVICE,
          useValue: mockSubsidiaryLedgerService,
        },
      ],
    }).compile();

    service = module.get(BillingLetterService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return billing letters with filters', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce([
          {
            id: '1',
            letter_number: 'BL-AR-2024-0001',
            type: 'receivable',
            status: 'outstanding',
          },
          {
            id: '2',
            letter_number: 'BL-AR-2024-0002',
            type: 'receivable',
            status: 'paid',
          },
        ]);

      const result = await service.findAll({
        type: 'receivable',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should apply all filter parameters', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([{ id: '1' }]);

      await service.findAll({
        type: 'payable',
        status: 'outstanding',
        customerId: 'c1',
        supplierId: 's1',
        page: 2,
        limit: 5,
      });

      const countQuery = mockDataSource.query.mock.calls[0];
      expect(countQuery[0]).toContain('bl.type = $1');
      expect(countQuery[0]).toContain('bl.status = $2');
      expect(countQuery[0]).toContain('bl.customer_id = $3');
      expect(countQuery[0]).toContain('bl.supplier_id = $4');
      expect(countQuery[1]).toEqual(['payable', 'outstanding', 'c1', 's1']);
    });
  });

  describe('findById', () => {
    it('should return billing letter with items', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          { id: '1', letter_number: 'BL-AR-2024-0001', type: 'receivable' },
        ])
        .mockResolvedValueOnce([
          {
            id: 'i1',
            billing_letter_id: '1',
            invoice_number: 'INV-001',
            outstanding_amount: 500,
          },
        ]);

      const result = await service.findById('1');

      expect(result.id).toBe('1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].invoice_number).toBe('INV-001');
    });

    it('should throw NotFoundException when not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generate', () => {
    it('should generate a receivable billing letter', async () => {
      const year = new Date().getFullYear();
      // generateLetterNumber query
      mockDataSource.query.mockResolvedValueOnce([]);
      // customer name query
      mockDataSource.query.mockResolvedValueOnce([{ name: 'Customer A' }]);
      // invoice query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'inv1',
          invoice_number: 'INV-001',
          issue_date: '2024-01-01',
          due_date: '2024-01-31',
          amount: 1000,
          paid_amount: 0,
        },
      ]);
      // INSERT billing_letters
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          letter_number: `BL-AR-${year}-0001`,
          type: 'receivable',
          status: 'outstanding',
          total_amount: 1000,
          paid_amount: 0,
        },
      ]);
      // INSERT billing_letter_items
      mockDataSource.query.mockResolvedValueOnce(undefined);

      queueRepoMock.create.mockReturnValue({});
      queueRepoMock.save.mockResolvedValue({});

      const result = await service.generate({
        type: 'receivable',
        customerId: 'c1',
        invoiceIds: ['inv1'],
      });

      expect(result.id).toBe('bl1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].outstandingAmount).toBe(1000);
    });

    it('should throw if neither customerId nor supplierId provided', async () => {
      // generateLetterNumber is called first, return empty
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(
        service.generate({
          type: 'receivable',
          invoiceIds: ['inv1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if payment amount is zero or negative', async () => {
      // generateLetterNumber
      mockDataSource.query.mockResolvedValueOnce([]);
      // customer name query
      mockDataSource.query.mockResolvedValueOnce([{ name: 'Customer A' }]);
      // invoice query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'inv1',
          invoice_number: 'INV-001',
          issue_date: '2024-01-01',
          due_date: '2024-01-31',
          amount: 1000,
          paid_amount: 0,
        },
      ]);

      await expect(
        service.generate({
          type: 'receivable',
          customerId: 'c1',
          invoiceIds: ['inv1'],
          paymentAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if payment exceeds total outstanding', async () => {
      // generateLetterNumber
      mockDataSource.query.mockResolvedValueOnce([]);
      // customer name query
      mockDataSource.query.mockResolvedValueOnce([{ name: 'Customer A' }]);
      // invoice query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'inv1',
          invoice_number: 'INV-001',
          issue_date: '2024-01-01',
          due_date: '2024-01-31',
          amount: 1000,
          paid_amount: 0,
        },
      ]);

      await expect(
        service.generate({
          type: 'receivable',
          customerId: 'c1',
          invoiceIds: ['inv1'],
          paymentAmount: 2000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyPayment', () => {
    it('should apply payment FIFO to invoices for payable', async () => {
      // Letter query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          type: 'payable',
          total_amount: 500,
          supplier_id: 's1',
          supplier_name: 'Supplier A',
          customer_id: null,
          customer_name: null,
          letter_number: 'BL-AP-2024-0001',
        },
      ]);
      // Items query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'i1',
          invoice_id: 'inv1',
          invoice_number: 'INV-001',
          due_date: '2024-01-15',
        },
        {
          id: 'i2',
          invoice_id: 'inv2',
          invoice_number: 'INV-002',
          due_date: '2024-01-31',
        },
      ]);
      // Invoice 1 query
      mockDataSource.query.mockResolvedValueOnce([
        { amount: 300, paid_amount: 0, status: 'pending' },
      ]);
      // Update invoice 1
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Update billing letter item 1
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Invoice 2 query
      mockDataSource.query.mockResolvedValueOnce([
        { amount: 400, paid_amount: 0, status: 'pending' },
      ]);
      // Update invoice 2
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Update billing letter item 2
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Update billing letter status
      mockDataSource.query.mockResolvedValueOnce(undefined);

      await service.applyPayment('bl1', 'je1');

      expect(mockSubsidiaryLedgerService.recordApEntry).toHaveBeenCalledTimes(
        2,
      );
      expect(mockSubsidiaryLedgerService.recordApEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          debit: 300,
          invoiceId: 'inv1',
        }),
      );
      expect(mockSubsidiaryLedgerService.recordApEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          debit: 200,
          invoiceId: 'inv2',
        }),
      );
    });

    it('should apply payment for receivable type', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          type: 'receivable',
          total_amount: 500,
          customer_id: 'c1',
          customer_name: 'Customer A',
          supplier_id: null,
          supplier_name: null,
          letter_number: 'BL-AR-2024-0001',
        },
      ]);
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'i1',
          invoice_id: 'inv1',
          invoice_number: 'INV-001',
          due_date: '2024-01-15',
        },
      ]);
      mockDataSource.query.mockResolvedValueOnce([
        { amount: 500, paid_amount: 0, status: 'outstanding' },
      ]);
      mockDataSource.query.mockResolvedValueOnce(undefined); // update invoice
      mockDataSource.query.mockResolvedValueOnce(undefined); // update item
      mockDataSource.query.mockResolvedValueOnce(undefined); // update letter

      await service.applyPayment('bl1', 'je1');

      expect(mockSubsidiaryLedgerService.recordArEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          credit: 500,
          customerId: 'c1',
        }),
      );
    });

    it('should do nothing if letter not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.applyPayment('nonexistent', 'je1');

      expect(mockSubsidiaryLedgerService.recordApEntry).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should recompute billing letter status as paid', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          type: 'receivable',
          status: 'outstanding',
          paid_amount: 0,
        },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'i1', invoice_id: 'inv1' },
      ]);
      // Invoice query
      mockDataSource.query.mockResolvedValueOnce([
        { amount: 1000, paid_amount: 1000 },
      ]);
      // Update item
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Update letter
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Final findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'bl1', type: 'receivable', status: 'paid', paid_amount: 1000 },
      ]);
      // Final findById: items query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'i1',
          invoice_id: 'inv1',
          paid_amount: 1000,
          outstanding_amount: 0,
        },
      ]);

      const result = await service.updateStatus('bl1');

      expect(result.status).toBe('paid');
    });

    it('should recompute status as partially_paid', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          type: 'receivable',
          status: 'outstanding',
          paid_amount: 0,
        },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'i1', invoice_id: 'inv1' },
      ]);
      // Invoice query
      mockDataSource.query.mockResolvedValueOnce([
        { amount: 1000, paid_amount: 500 },
      ]);
      // Update item
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Update letter
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Final findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'bl1',
          type: 'receivable',
          status: 'partially_paid',
          paid_amount: 500,
        },
      ]);
      // Final findById: items query
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'i1',
          invoice_id: 'inv1',
          paid_amount: 500,
          outstanding_amount: 500,
        },
      ]);

      const result = await service.updateStatus('bl1');

      expect(result.status).toBe('partially_paid');
    });
  });

  describe('delete', () => {
    it('should delete an outstanding billing letter', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'bl1', status: 'outstanding', paid_amount: 0 },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([]);
      // GL queue check
      mockDataSource.query.mockResolvedValueOnce([]);
      // Cancel pending queue entries
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Delete items
      mockDataSource.query.mockResolvedValueOnce(undefined);
      // Delete letter
      mockDataSource.query.mockResolvedValueOnce(undefined);

      await service.delete('bl1');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM billing_letters'),
        ['bl1'],
      );
    });

    it('should throw if letter is paid', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'bl1', status: 'paid', paid_amount: 1000 },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(service.delete('bl1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if letter has payments recorded', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'bl1', status: 'outstanding', paid_amount: 500 },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(service.delete('bl1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if GL queue entry has been posted', async () => {
      // findById: letter query
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'bl1', status: 'outstanding', paid_amount: 0 },
      ]);
      // findById: items query
      mockDataSource.query.mockResolvedValueOnce([]);
      // GL queue check
      mockDataSource.query.mockResolvedValueOnce([
        { id: 'q1', status: 'posted' },
      ]);

      await expect(service.delete('bl1')).rejects.toThrow(BadRequestException);
    });
  });
});
