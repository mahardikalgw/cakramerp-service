import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from 'decimal.js';
import { FinancialStatementsService } from './financial-statements.service';
import {
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';

describe('FinancialStatementsService', () => {
  let service: FinancialStatementsService;

  const mockAccountRepo = {
    findByType: jest.fn(),
  };

  const mockJournalLineRepo = {
    findByDateRange: jest.fn(),
    findByAccountIdsAndDateRange: jest.fn(),
    sumByAccountIdsAndDateRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialStatementsService,
        { provide: ACCOUNT_REPOSITORY, useValue: mockAccountRepo },
        {
          provide: JOURNAL_ENTRY_LINE_REPOSITORY,
          useValue: mockJournalLineRepo,
        },
      ],
    }).compile();

    service = module.get(FinancialStatementsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalanceSheet', () => {
    it('should return a balance sheet with assets, liabilities, and equity', async () => {
      const assetAccounts = [
        { id: 'a1', code: '1100', name: 'Cash', type: 'asset' },
        { id: 'a2', code: '1200', name: 'AR', type: 'asset' },
      ];
      const liabilityAccounts = [
        { id: 'l1', code: '2100', name: 'AP', type: 'liability' },
      ];
      const equityAccounts = [
        { id: 'e1', code: '3100', name: 'Capital', type: 'equity' },
      ];
      const revenueAccounts = [
        { id: 'r1', code: '4100', name: 'Revenue', type: 'revenue' },
      ];
      const expenseAccounts = [
        { id: 'x1', code: '5100', name: 'COGS', type: 'expense' },
      ];

      mockAccountRepo.findByType
        .mockResolvedValueOnce(assetAccounts)
        .mockResolvedValueOnce(liabilityAccounts)
        .mockResolvedValueOnce(equityAccounts)
        .mockResolvedValueOnce(revenueAccounts)
        .mockResolvedValueOnce(expenseAccounts);

      const allLines = [
        {
          accountId: 'a1',
          debit: new Decimal(10000),
          credit: new Decimal(3000),
        },
        { accountId: 'a2', debit: new Decimal(5000), credit: new Decimal(0) },
        { accountId: 'l1', debit: new Decimal(0), credit: new Decimal(4000) },
        { accountId: 'e1', debit: new Decimal(0), credit: new Decimal(5000) },
        { accountId: 'r1', debit: new Decimal(0), credit: new Decimal(8000) },
        { accountId: 'x1', debit: new Decimal(3000), credit: new Decimal(0) },
      ];
      mockJournalLineRepo.sumByAccountIdsAndDateRange.mockResolvedValue([
        { accountId: 'a1', totalDebit: 10000, totalCredit: 3000 },
        { accountId: 'a2', totalDebit: 5000, totalCredit: 0 },
        { accountId: 'l1', totalDebit: 0, totalCredit: 4000 },
        { accountId: 'e1', totalDebit: 0, totalCredit: 5000 },
      ]);
      mockJournalLineRepo.sumByAccountIdsAndDateRange.mockResolvedValueOnce([
        { accountId: 'a1', totalDebit: 10000, totalCredit: 3000 },
        { accountId: 'a2', totalDebit: 5000, totalCredit: 0 },
        { accountId: 'l1', totalDebit: 0, totalCredit: 4000 },
        { accountId: 'e1', totalDebit: 0, totalCredit: 5000 },
      ]).mockResolvedValueOnce([
        { accountId: 'r1', totalDebit: 0, totalCredit: 8000 },
        { accountId: 'x1', totalDebit: 3000, totalCredit: 0 },
      ]);

      const result = await service.getBalanceSheet('2024-12-31');

      expect(result.asOfDate).toBe('2024-12-31');
      expect(result.totalAssets).toBe(12000); // (10000-3000) + (5000-0)
      expect(result.totalLiabilities).toBe(4000); // 0-0+4000
      expect(result.totalEquity).toBe(5000 + 5000); // Capital + Retained Earnings (8000-3000)
      expect(result.totalLiabilitiesAndEquity).toBe(
        result.totalLiabilities + result.totalEquity,
      );
    });

    it('should exclude accounts with zero balance', async () => {
      mockAccountRepo.findByType
        .mockResolvedValueOnce([
          { id: 'a1', code: '1100', name: 'Cash', type: 'asset' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockJournalLineRepo.sumByAccountIdsAndDateRange
        .mockResolvedValueOnce([
          { accountId: 'a1', totalDebit: 500, totalCredit: 500 },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getBalanceSheet('2024-12-31');

      expect(result.assets).toHaveLength(0);
      expect(result.totalAssets).toBe(0);
    });

    it('should add retained earnings when there is profit', async () => {
      mockAccountRepo.findByType
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 'r1', code: '4100', name: 'Revenue', type: 'revenue' },
        ])
        .mockResolvedValueOnce([
          { id: 'x1', code: '5100', name: 'Expense', type: 'expense' },
        ]);

      mockJournalLineRepo.sumByAccountIdsAndDateRange
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { accountId: 'r1', totalDebit: 0, totalCredit: 10000 },
          { accountId: 'x1', totalDebit: 6000, totalCredit: 0 },
        ]);

      const result = await service.getBalanceSheet('2024-12-31');

      const retainedEarnings = result.equity.find((e) => e.code === 'RE');
      expect(retainedEarnings).toBeDefined();
      expect(retainedEarnings!.amount).toBe(4000); // 10000 - 6000
    });
  });

  describe('getProfitLoss', () => {
    it('should return profit and loss statement', async () => {
      const revenueAccounts = [
        { id: 'r1', code: '4100', name: 'Sales', type: 'revenue' },
      ];
      const expenseAccounts = [
        { id: 'x1', code: '5100', name: 'COGS', type: 'expense' },
        { id: 'x2', code: '6100', name: 'Salary', type: 'expense' },
      ];

      mockAccountRepo.findByType
        .mockResolvedValueOnce(revenueAccounts)
        .mockResolvedValueOnce(expenseAccounts);

      mockJournalLineRepo.findByDateRange.mockResolvedValue([
        { accountId: 'r1', debit: new Decimal(0), credit: new Decimal(10000) },
        { accountId: 'x1', debit: new Decimal(4000), credit: new Decimal(0) },
        { accountId: 'x2', debit: new Decimal(3000), credit: new Decimal(0) },
      ]);

      const result = await service.getProfitLoss('2024-01-01', '2024-12-31');

      expect(result.period.from).toBe('2024-01-01');
      expect(result.period.to).toBe('2024-12-31');
      expect(result.totalRevenue).toBe(10000);
      expect(result.totalCogs).toBe(4000); // code starts with '5'
      expect(result.totalOperatingExpenses).toBe(3000); // code doesn't start with '5'
      expect(result.grossProfit).toBe(6000); // 10000 - 4000
      expect(result.netProfit).toBe(3000); // 6000 - 3000
    });

    it('should include prior period comparison when comparePrior is true', async () => {
      const revenueAccounts = [
        { id: 'r1', code: '4100', name: 'Sales', type: 'revenue' },
      ];
      const expenseAccounts: any[] = [];

      mockAccountRepo.findByType
        .mockResolvedValueOnce(revenueAccounts)
        .mockResolvedValueOnce(expenseAccounts);

      // Current period lines
      mockJournalLineRepo.findByDateRange.mockResolvedValueOnce([
        { accountId: 'r1', debit: new Decimal(0), credit: new Decimal(10000) },
      ]);
      // Prior period lines
      mockJournalLineRepo.findByDateRange.mockResolvedValueOnce([
        { accountId: 'r1', debit: new Decimal(0), credit: new Decimal(8000) },
      ]);

      const result = await service.getProfitLoss(
        '2024-01-01',
        '2024-12-31',
        true,
      );

      expect(result.priorPeriod).toBeDefined();
      expect(result.totalRevenue).toBe(10000);
      expect(result.priorTotalRevenue).toBe(8000);
      expect(result.revenue[0].amount).toBe(10000);
      expect(result.revenue[0].priorAmount).toBe(8000);
    });

    it('should not include prior data when comparePrior is false', async () => {
      mockAccountRepo.findByType
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockJournalLineRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getProfitLoss(
        '2024-01-01',
        '2024-12-31',
        false,
      );

      expect(result.priorPeriod).toBeUndefined();
      expect(result.priorTotalRevenue).toBeUndefined();
      expect(result.priorNetProfit).toBeUndefined();
    });
  });
});
