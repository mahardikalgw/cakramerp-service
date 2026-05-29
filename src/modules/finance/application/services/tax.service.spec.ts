import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TAX_INVOICE_REPOSITORY } from '../../domain/repositories/finance-repository.port';

describe('TaxService', () => {
  let service: TaxService;

  const mockRepo = {
    findByMonthAndYear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: TAX_INVOICE_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(TaxService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyReport', () => {
    it('should return a monthly tax report', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.getMonthlyReport(1, 2024);

      expect(result.month).toBe(1);
      expect(result.year).toBe(2024);
      expect(result.invoices).toHaveLength(1);
      expect(result.totalDpp).toBe(1000000);
      expect(result.totalPpn).toBe(110000);
      expect(result.hasErrors).toBe(false);
    });

    it('should detect invalid NPWP format', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '123',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.getMonthlyReport(1, 2024);

      expect(result.hasErrors).toBe(true);
      expect(result.validationErrors[0].errors[0]).toContain('Invalid NPWP format');
    });

    it('should detect invalid tax invoice number format', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: 'INVALID',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.getMonthlyReport(1, 2024);

      expect(result.hasErrors).toBe(true);
      expect(result.validationErrors[0].errors.some((e) => e.includes('Invalid tax invoice number'))).toBe(true);
    });

    it('should detect DPP <= 0', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 0,
          ppnAmount: 0,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.getMonthlyReport(1, 2024);

      expect(result.hasErrors).toBe(true);
      expect(result.validationErrors[0].errors).toContain('DPP must be greater than 0');
    });

    it('should detect PPN amount mismatch', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 50000, // Should be ~110000
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.getMonthlyReport(1, 2024);

      expect(result.hasErrors).toBe(true);
      expect(result.validationErrors[0].errors.some((e) => e.includes("doesn't match 11% of DPP"))).toBe(true);
    });

    it('should return empty report when no invoices', async () => {
      mockRepo.findByMonthAndYear.mockResolvedValue([]);

      const result = await service.getMonthlyReport(6, 2024);

      expect(result.invoices).toHaveLength(0);
      expect(result.totalDpp).toBe(0);
      expect(result.totalPpn).toBe(0);
      expect(result.hasErrors).toBe(false);
    });
  });

  describe('exportCsv', () => {
    it('should export valid invoices as e-Faktur CSV', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.exportCsv(1, 2024);

      expect(result).toContain('FK,KD_JENIS_TRANSAKSI');
      expect(result).toContain('010.000-24.00000001');
      expect(result).toContain('1234567890123456');
      expect(result).toContain('1000000');
      expect(result).toContain('110000');
    });

    it('should throw if there are validation errors', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: 'INVALID',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      await expect(service.exportCsv(1, 2024)).rejects.toThrow(BadRequestException);
      await expect(service.exportCsv(1, 2024)).rejects.toThrow('Cannot export: there are validation errors');
    });
  });

  describe('exportPdf', () => {
    it('should export tax report as text', async () => {
      const invoices = [
        {
          id: '1',
          taxInvoiceNumber: '010.000-24.00000001',
          arInvoiceId: 'ar1',
          transactionDate: new Date('2024-01-15'),
          clientNpwp: '1234567890123456',
          clientName: 'PT ABC',
          dpp: 1000000,
          ppnAmount: 110000,
          status: 'valid',
        },
      ];
      mockRepo.findByMonthAndYear.mockResolvedValue(invoices);

      const result = await service.exportPdf(1, 2024);

      expect(result).toContain('LAPORAN PPN');
      expect(result).toContain('01/2024');
      expect(result).toContain('010.000-24.00000001');
      expect(result).toContain('Total DPP: 1000000');
      expect(result).toContain('Total PPN: 110000');
    });
  });
});
